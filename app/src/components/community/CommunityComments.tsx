import { useEffect, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { communityService } from '@/lib/communityService';
import type { AuthUser } from '@/lib/auth';
import type { CommunityComment } from '@/types/community';

export default function CommunityComments({
  postId,
  currentUser,
  onLoginClick,
  onCountChange,
}: {
  postId: string;
  currentUser: AuthUser | null;
  onLoginClick: () => void;
  onCountChange: (count: number) => void;
}) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void communityService?.listComments(postId).then((items) => {
      setComments(items);
      onCountChange(items.length);
    });
  }, [onCountChange, postId]);

  const submit = async () => {
    if (!currentUser) { setError('请先登录后评论'); onLoginClick(); return; }
    const value = content.trim();
    if (!value) { setError('评论不能为空'); return; }
    if (value.length > 1000) { setError('评论最多 1000 字'); return; }
    setBusy(true);
    setError('');
    try {
      const comment = await communityService?.addComment(currentUser.userId, currentUser.nickname, postId, value);
      if (comment) {
        const next = [...comments, comment];
        setComments(next);
        onCountChange(next.length);
        setContent('');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '评论发表失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (comment: CommunityComment) => {
    if (!currentUser || comment.userId !== currentUser.userId) return;
    if (!window.confirm('删除这条评论？')) return;
    if (await communityService?.deleteComment(currentUser.userId, comment.id)) {
      const next = comments.filter((item) => item.id !== comment.id);
      setComments(next);
      onCountChange(next.length);
    }
  };

  return (
    <section className="mt-8 border-t pt-6" style={{ borderColor: 'rgba(92,64,48,0.12)' }}>
      <h2 className="font-kai text-lg" style={{ color: '#3b2d22' }}>评论 {comments.length}</h2>
      <div className="mt-3 rounded-xl border bg-white/55 p-3" style={{ borderColor: 'rgba(92,64,48,0.12)' }}>
        <textarea value={content} maxLength={1000} onChange={(event) => setContent(event.target.value)} rows={3} className="w-full resize-none bg-transparent font-kai text-sm leading-7 outline-none" placeholder={currentUser ? '说点什么……' : '登录后参与讨论'} />
        <div className="flex items-center justify-between"><span className="font-kai text-[10px]" style={{ color: error ? '#a13b32' : '#998a79' }}>{error || `${content.length} / 1000`}</span><button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex items-center gap-1 rounded-full px-3 py-2 font-kai text-xs text-white disabled:opacity-50" style={{ backgroundColor: '#738260' }}><Send size={13} />发表</button></div>
      </div>
      <div className="mt-4 space-y-3">
        {comments.length === 0 ? <p className="py-6 text-center font-kai text-xs" style={{ color: '#9a8b7a' }}>还没有评论，来聊聊你的看法。</p> : null}
        {comments.map((comment) => <article key={comment.id} className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,253,248,0.58)', border: '1px solid rgba(92,64,48,0.08)' }}><div className="flex items-center justify-between"><span className="font-kai text-xs" style={{ color: '#67594d' }}>{comment.nickname}</span><span className="font-kai text-[10px]" style={{ color: '#9b8c7b' }}>{new Date(comment.createdAt).toLocaleDateString('zh-CN')}</span></div><p className="mt-2 whitespace-pre-wrap font-kai text-sm leading-7" style={{ color: '#4e4237' }}>{comment.content}</p>{currentUser?.userId === comment.userId ? <button type="button" onClick={() => void remove(comment)} className="mt-2 inline-flex items-center gap-1 font-kai text-[10px]" style={{ color: '#a13b32' }}><Trash2 size={12} />删除</button> : null}</article>)}
      </div>
    </section>
  );
}
