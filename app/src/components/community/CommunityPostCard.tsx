import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import { buildCommunityExcerpt } from '@/lib/communityRules';
import type { CommunityPost } from '@/types/community';

export default function CommunityPostCard({
  post,
  onOpen,
}: {
  post: CommunityPost;
  onOpen: (post: CommunityPost) => void;
}) {
  const cover = post.images.find((image) => image.id === post.coverImageId);
  return (
    <button
      type="button"
      onClick={() => onOpen(post)}
      className="w-full overflow-hidden rounded-2xl text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: 'rgba(255,253,248,0.86)', border: '1px solid rgba(92,64,48,0.11)', boxShadow: '0 6px 18px rgba(56,44,30,0.055)' }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 font-kai text-xs" style={{ color: '#827466' }}>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: '#71805f' }}>
            {post.nickname.slice(0, 1) || '艺'}
          </span>
          <span>{post.nickname}</span>
          <span>·</span>
          <span>{new Date(post.publishedAt).toLocaleDateString('zh-CN')}</span>
        </div>
        <h2 className="mt-3 font-kai text-lg leading-relaxed" style={{ color: '#35291f' }}>{post.title}</h2>
        <p className="mt-1.5 font-kai text-sm leading-7" style={{ color: '#706356' }}>{buildCommunityExcerpt(post.body, 110)}</p>
      </div>
      {cover && (
        <div className="relative mx-4 overflow-hidden rounded-xl">
          <img src={cover.source} alt="帖子封面" className="h-52 w-full object-cover" />
          {post.images.length > 1 && <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white">共 {post.images.length} 张</span>}
        </div>
      )}
      <div className="flex items-center justify-between px-4 pb-4 pt-3 font-kai text-xs" style={{ color: '#87796a' }}>
        <span className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(102,118,83,0.11)', color: '#61704f' }}>#{post.topic}</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><Heart size={14} />{post.likes}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle size={14} />{post.comments}</span>
          <Bookmark size={14} />
        </span>
      </div>
    </button>
  );
}
