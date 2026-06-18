import { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, Heart, Trash2, X } from 'lucide-react';
import CommunityComments from '@/components/community/CommunityComments';
import { communityService } from '@/lib/communityService';
import type { AuthUser } from '@/lib/auth';
import type { CommunityPost } from '@/types/community';

export default function CommunityPostPage({
  postId,
  currentUser,
  onLoginClick,
  onBack,
}: {
  postId: string;
  currentUser: AuthUser | null;
  onLoginClick: () => void;
  onBack: () => void;
}) {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const request = communityService?.getPost(postId, currentUser?.userId) || Promise.resolve(null);
    void request.then((nextPost) => {
      if (cancelled) return;
      setPost(nextPost);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentUser?.userId, postId]);

  const toggleReaction = async (type: 'like' | 'bookmark') => {
    if (!currentUser) { setMessage('请先登录后操作'); onLoginClick(); return; }
    if (!post || !communityService) return;
    const previous = post;
    const activeKey = type === 'like' ? 'likedByCurrentUser' : 'bookmarkedByCurrentUser';
    const countKey = type === 'like' ? 'likes' : 'bookmarks';
    const nextActive = !post[activeKey];
    setPost({ ...post, [activeKey]: nextActive, [countKey]: Math.max(0, post[countKey] + (nextActive ? 1 : -1)) });
    try { await communityService.toggleReaction(currentUser.userId, post.id, type); }
    catch { setPost(previous); setMessage('操作失败，请重试'); }
  };

  const removePost = async () => {
    if (!post || !currentUser || post.userId !== currentUser.userId || !communityService) return;
    if (!window.confirm('删除这篇帖子？删除后无法恢复。')) return;
    if (await communityService.deletePost(currentUser.userId, post.id)) onBack();
  };

  if (loading) return <p className="py-24 text-center font-kai text-sm" style={{ color: '#9a8b7b' }}>正在加载帖子…</p>;
  if (!post) return <main className="mx-auto max-w-[680px] px-4 py-24 text-center"><p className="font-kai text-base" style={{ color: '#746658' }}>内容已删除或不存在</p><button type="button" onClick={onBack} className="mt-4 font-kai text-sm underline">返回艺史广场</button></main>;

  return (
    <main className="mx-auto max-w-[760px] px-3 pb-24 pt-4 md:px-6 md:pb-12 md:pt-8">
      <div className="flex items-center justify-between"><button type="button" onClick={onBack} className="inline-flex items-center gap-1 font-kai text-sm" style={{ color: '#6d5e50' }}><ArrowLeft size={17} />返回广场</button>{currentUser?.userId === post.userId ? <button type="button" onClick={() => void removePost()} className="inline-flex items-center gap-1 font-kai text-xs" style={{ color: '#a13b32' }}><Trash2 size={14} />删除</button> : <span />}</div>
      <article className="mt-5 rounded-2xl p-4 md:p-7" style={{ backgroundColor: 'rgba(255,253,248,0.76)', border: '1px solid rgba(92,64,48,0.1)' }}>
        <div className="flex items-center gap-2 font-kai text-xs" style={{ color: '#837466' }}><span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: '#738260' }}>{post.nickname.slice(0, 1) || '艺'}</span><span>{post.nickname}</span><span>·</span><span>{new Date(post.publishedAt).toLocaleDateString('zh-CN')}</span></div>
        <h1 className="mt-5 font-kai text-2xl leading-relaxed" style={{ color: '#31251c' }}>{post.title}</h1>
        <p className="mt-4 whitespace-pre-wrap font-kai text-[15px] leading-8" style={{ color: '#4f4338' }}>{post.body}</p>
        {post.images.length > 0 ? <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3">{post.images.map((image) => <button type="button" key={image.id} onClick={() => setActiveImage(image.source)} className="overflow-hidden rounded-xl"><img src={image.source} alt="帖子配图" className="aspect-square h-full w-full object-cover" /></button>)}</div> : null}
        <div className="mt-6 flex items-center justify-between"><span className="rounded-full px-3 py-1.5 font-kai text-xs" style={{ backgroundColor: '#e2e8dc', color: '#5c6f4c' }}>#{post.topic}</span><div className="flex gap-3"><button type="button" onClick={() => void toggleReaction('like')} className="inline-flex items-center gap-1 font-kai text-xs" style={{ color: post.likedByCurrentUser ? '#a13b32' : '#776a5d' }}><Heart size={16} fill={post.likedByCurrentUser ? 'currentColor' : 'none'} />{post.likes}</button><button type="button" onClick={() => void toggleReaction('bookmark')} className="inline-flex items-center gap-1 font-kai text-xs" style={{ color: post.bookmarkedByCurrentUser ? '#657653' : '#776a5d' }}><Bookmark size={16} fill={post.bookmarkedByCurrentUser ? 'currentColor' : 'none'} />{post.bookmarks}</button></div></div>
        {message ? <p className="mt-3 text-right font-kai text-[11px]" style={{ color: '#a13b32' }}>{message}</p> : null}
        <CommunityComments postId={post.id} currentUser={currentUser} onLoginClick={onLoginClick} onCountChange={(comments) => setPost((value) => value ? { ...value, comments } : value)} />
      </article>
      {activeImage ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true"><button type="button" onClick={() => setActiveImage('')} className="absolute right-4 top-4 text-white" aria-label="关闭图片"><X size={26} /></button><img src={activeImage} alt="帖子配图大图" className="max-h-full max-w-full object-contain" /></div> : null}
    </main>
  );
}
