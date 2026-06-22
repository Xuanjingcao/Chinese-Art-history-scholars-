import { ArrowLeft, Check } from 'lucide-react';
import CommunityPostCard from './CommunityPostCard';
import type { CommunityPost } from '@/types/community';

export default function CommunityCoverPreview({
  post,
  onBack,
  onConfirm,
  busy,
}: {
  post: CommunityPost;
  onBack: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <main className="mx-auto max-w-[680px] px-3 pb-24 pt-4 md:px-6 md:pt-8">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 font-kai text-sm" style={{ color: '#6d5e50' }}><ArrowLeft size={17} />返回编辑</button>
        <h1 className="font-kai text-xl" style={{ color: '#34271c' }}>确认封面</h1>
        <span className="w-20" />
      </div>
      <p className="my-5 rounded-xl px-4 py-3 text-center font-kai text-xs" style={{ backgroundColor: '#e4eadf', color: '#586a4b' }}>下面是帖子在艺史广场中的展示效果</p>
      <CommunityPostCard post={post} onOpen={() => undefined} onLike={() => undefined} likePending />
      <button type="button" disabled={busy} onClick={onConfirm} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 font-kai text-sm text-white disabled:opacity-50" style={{ backgroundColor: '#97352f' }}><Check size={17} />{busy ? '正在发布…' : '确认并发布'}</button>
    </main>
  );
}
