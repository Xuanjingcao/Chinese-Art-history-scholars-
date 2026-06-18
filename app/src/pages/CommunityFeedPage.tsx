import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, PenLine, Search } from 'lucide-react';
import CommunityPostCard from '@/components/community/CommunityPostCard';
import { communityService } from '@/lib/communityService';
import { sortCommunityPosts } from '@/lib/communityRules';
import { COMMUNITY_TOPICS, type CommunityPost, type CommunityTopic } from '@/types/community';

export default function CommunityFeedPage({
  onBack,
  onCreatePost,
  onOpenPost,
}: {
  onBack: () => void;
  onCreatePost: () => void;
  onOpenPost: (post: CommunityPost) => void;
}) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [mode, setMode] = useState<'recommended' | 'latest'>('recommended');
  const [topic, setTopic] = useState<CommunityTopic | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPosts(await communityService?.listPublished(topic) || []);
    } catch {
      setError('暂时无法加载广场内容，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [topic]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  return (
    <main className="mx-auto max-w-[760px] px-3 pb-24 pt-4 md:px-6 md:pb-12 md:pt-8">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex h-10 w-10 items-center justify-center rounded-full" aria-label="返回首页" style={{ color: '#695a4d', backgroundColor: 'rgba(255,253,248,0.66)' }}><ArrowLeft size={18} /></button>
        <div className="text-center"><h1 className="font-kai text-2xl" style={{ color: '#34271c' }}>艺史广场</h1><p className="font-kai text-xs" style={{ color: '#8a7c6b' }}>分享最近在读、在看、在想的</p></div>
        <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full" aria-label="搜索广场" style={{ color: '#695a4d', backgroundColor: 'rgba(255,253,248,0.66)' }}><Search size={18} /></button>
      </div>

      <div className="mt-5 flex gap-5 border-b px-2 font-kai text-sm" style={{ borderColor: 'rgba(92,64,48,0.12)' }}>
        {([['recommended', '推荐'], ['latest', '最新']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setMode(key)} className="pb-2" style={{ color: mode === key ? '#913a32' : '#847568', borderBottom: mode === key ? '2px solid #913a32' : '2px solid transparent' }}>{label}</button>)}
      </div>
      <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-2">
        <button type="button" onClick={() => setTopic('')} className="shrink-0 rounded-full px-3 py-1.5 font-kai text-xs" style={{ backgroundColor: topic === '' ? '#e1e8da' : 'rgba(255,253,248,0.72)', color: '#61704f' }}>全部</button>
        {COMMUNITY_TOPICS.map((item) => <button key={item} type="button" onClick={() => setTopic(item)} className="shrink-0 rounded-full px-3 py-1.5 font-kai text-xs" style={{ backgroundColor: topic === item ? '#e1e8da' : 'rgba(255,253,248,0.72)', color: '#6d6256' }}>{item}</button>)}
      </div>

      <button type="button" onClick={onCreatePost} className="mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-kai text-sm" style={{ backgroundColor: 'rgba(255,253,248,0.75)', border: '1px solid rgba(92,64,48,0.1)', color: '#8d7e6e' }}><PenLine size={17} />发布感想，分享你的观察……</button>

      <div className="mt-4 space-y-4">
        {loading ? <p className="py-16 text-center font-kai text-sm" style={{ color: '#9b8c7b' }}>正在打开广场…</p> : null}
        {!loading && error ? <div className="py-16 text-center"><p className="font-kai text-sm" style={{ color: '#a13b32' }}>{error}</p><button type="button" onClick={() => void loadPosts()} className="mt-3 font-kai text-xs underline">重新加载</button></div> : null}
        {!loading && !error && posts.length === 0 ? <p className="py-16 text-center font-kai text-sm" style={{ color: '#9b8c7b' }}>还没有内容，来写下第一篇吧。</p> : null}
        {!loading && !error ? sortCommunityPosts(posts, mode).map((post) => <CommunityPostCard key={post.id} post={post} onOpen={onOpenPost} />) : null}
      </div>

      <button type="button" onClick={onCreatePost} aria-label="发布感想" className="fixed bottom-[82px] right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg md:bottom-8 md:right-8" style={{ backgroundColor: '#97352f' }}><PenLine size={20} /></button>
    </main>
  );
}
