import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import CommunityCoverPreview from '@/components/community/CommunityCoverPreview';
import CommunityImageGrid from '@/components/community/CommunityImageGrid';
import { communityService, createCommunityDraftSaveQueue } from '@/lib/communityService';
import { canPublishCommunityDraft } from '@/lib/communityRules';
import { COMMUNITY_TOPICS, type CommunityDraft, type CommunityPost } from '@/types/community';

type EditorStage = 'editing' | 'cover-preview' | 'publishing';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const EMPTY_DRAFT: CommunityDraft = {
  title: '', body: '', topic: '', images: [], coverImageId: '',
};

export default function CommunityEditorPage({
  userId,
  nickname,
  initialDraft,
  onCancel,
  onPublished,
}: {
  userId: string;
  nickname: string;
  initialDraft?: CommunityDraft;
  onCancel: () => void;
  onPublished: (post: CommunityPost) => void;
}) {
  const [draft, setDraft] = useState<CommunityDraft>(initialDraft || EMPTY_DRAFT);
  const [stage, setStage] = useState<EditorStage>('editing');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedSnapshot = useRef(JSON.stringify(initialDraft || EMPTY_DRAFT));

  const dirty = JSON.stringify(draft) !== lastSavedSnapshot.current;
  const hasContent = Boolean(draft.title.trim() || draft.body.trim() || draft.images.length);

  const persistDraft = useMemo(() => createCommunityDraftSaveQueue(async (snapshot) => {
    if (!communityService) throw new Error('发布服务暂不可用');
    if (!snapshot.id) return communityService.saveDraft(userId, nickname, snapshot);
    const updated = await communityService.updatePost(userId, snapshot.id, snapshot);
    if (!updated) throw new Error('无法保存待发布内容');
    return updated;
  }), [nickname, userId]);

  const resizeBody = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(260, element.scrollHeight)}px`;
  }, []);

  useEffect(() => { resizeBody(); }, [draft.body, resizeBody]);

  const saveDraft = useCallback(async () => {
    if (!communityService || !hasContent) return null;
    setSaveState('saving');
    setError('');
    try {
      const saved = await persistDraft(draft);
      setDraft(saved);
      lastSavedSnapshot.current = JSON.stringify(saved);
      setSavedAt(new Date(saved.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
      setSaveState('saved');
      return saved;
    } catch (caught) {
      setSaveState('error');
      setError(caught instanceof Error ? caught.message : '草稿保存失败');
      return null;
    }
  }, [draft, hasContent, persistDraft]);

  useEffect(() => {
    if (stage !== 'editing' || !dirty || !hasContent) return;
    const timer = window.setTimeout(() => { void saveDraft(); }, 2000);
    return () => window.clearTimeout(timer);
  }, [dirty, hasContent, saveDraft, stage]);

  const previewPost = useMemo<CommunityPost>(() => ({
    ...draft,
    id: draft.id || 'preview', userId, nickname, status: 'published',
    likes: 0, comments: 0, bookmarks: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString(),
  }), [draft, nickname, userId]);

  const requestPublish = async () => {
    const errors = canPublishCommunityDraft(draft);
    if (errors.length) { setError(errors[0]); return; }
    if (draft.images.length > 0) { setStage('cover-preview'); return; }
    await publish();
  };

  const publish = async () => {
    if (!communityService) return;
    setStage('publishing');
    setError('');
    try {
      const saved = await persistDraft(draft);
      const post = saved.status === 'published' ? saved : await communityService.publishPost(userId, nickname, saved.id);
      onPublished(post);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '发布失败，请重试');
      setStage('editing');
    }
  };

  const handleCancel = async () => {
    if (dirty && hasContent && window.confirm('当前内容尚未保存，是否存草稿后退出？')) await saveDraft();
    onCancel();
  };

  if (stage === 'cover-preview' || stage === 'publishing') {
    return <CommunityCoverPreview post={previewPost} onBack={() => setStage('editing')} onConfirm={() => void publish()} busy={stage === 'publishing'} />;
  }

  return (
    <main className="mx-auto max-w-[760px] px-3 pb-24 pt-4 md:px-6 md:pt-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => void handleCancel()} className="inline-flex items-center gap-1 font-kai text-sm" style={{ color: '#6c5e51' }}><ArrowLeft size={17} />取消</button>
        <h1 className="flex-1 text-center font-kai text-xl" style={{ color: '#34271c' }}>发布感想</h1>
        <button type="button" onClick={() => void saveDraft()} disabled={!hasContent || saveState === 'saving'} className="inline-flex items-center gap-1 rounded-full border px-3 py-2 font-kai text-xs disabled:opacity-50" style={{ borderColor: '#ad9d89', color: '#68594c' }}><Save size={14} />存草稿</button>
        <button type="button" onClick={() => void requestPublish()} className="rounded-full px-3 py-2 font-kai text-xs text-white" style={{ backgroundColor: '#97352f' }}>发布</button>
      </div>
      <p className="mt-2 h-5 text-center font-kai text-[11px]" style={{ color: saveState === 'error' ? '#a13b32' : '#69785a' }}>{saveState === 'saving' ? '正在保存…' : saveState === 'saved' ? `草稿已保存 · ${savedAt}` : ''}</p>

      <div className="mt-4 space-y-5 rounded-2xl p-4 md:p-6" style={{ backgroundColor: 'rgba(255,253,248,0.72)', border: '1px solid rgba(92,64,48,0.1)' }}>
        <label className="block"><span className="mb-2 flex justify-between font-kai text-xs" style={{ color: '#756758' }}><span>标题</span><span>{draft.title.length} / 60</span></span><input value={draft.title} maxLength={60} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="w-full rounded-xl border bg-white/70 px-4 py-3 font-kai text-base outline-none" style={{ borderColor: 'rgba(92,64,48,0.13)', color: '#392c22' }} placeholder="给这篇内容起一个清楚的标题" /></label>
        <label className="block"><span className="mb-2 flex justify-between font-kai text-xs" style={{ color: '#756758' }}><span>正文</span><span>{draft.body.length} / 10,000</span></span><textarea ref={textareaRef} value={draft.body} maxLength={10_000} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className="min-h-[260px] w-full resize-none overflow-hidden rounded-xl border bg-white/70 px-4 py-3 font-kai text-sm leading-8 outline-none" style={{ borderColor: 'rgba(92,64,48,0.13)', color: '#4f4338' }} placeholder="分享你的阅读、观展、求学或研究感受……" /></label>
        <CommunityImageGrid images={draft.images} coverImageId={draft.coverImageId} onChange={(images) => setDraft({ ...draft, images })} onCoverChange={(coverImageId) => setDraft({ ...draft, coverImageId })} />
        {draft.images.length > 0 ? <p className="font-kai text-[11px]" style={{ color: '#7a6c5d' }}>发布前会进入确认封面预览。</p> : null}
        <div><p className="mb-2 font-kai text-xs" style={{ color: '#756758' }}>选择一个话题</p><div className="flex flex-wrap gap-2">{COMMUNITY_TOPICS.map((topic) => <button type="button" key={topic} onClick={() => setDraft({ ...draft, topic })} className="rounded-full border px-3 py-2 font-kai text-xs" style={{ borderColor: draft.topic === topic ? '#879777' : 'rgba(92,64,48,0.12)', backgroundColor: draft.topic === topic ? '#e1e8da' : '#fffdf8', color: '#66594d' }}>{topic}</button>)}</div></div>
        {error ? <p className="rounded-xl px-3 py-2 font-kai text-xs" style={{ backgroundColor: 'rgba(161,59,50,0.08)', color: '#a13b32' }}>{error}</p> : null}
      </div>
    </main>
  );
}
