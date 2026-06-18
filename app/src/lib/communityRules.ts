import type { CommunityDraft, CommunityPost } from '../types/community.ts';

export function normalizeCommunityDraft(draft: CommunityDraft): CommunityDraft {
  return { ...draft, title: draft.title.trim(), body: draft.body.trim() };
}

export function canPublishCommunityDraft(draft: CommunityDraft): string[] {
  const value = normalizeCommunityDraft(draft);
  const errors: string[] = [];

  if (!value.title) errors.push('请填写标题');
  else if (value.title.length > 60) errors.push('标题最多 60 字');

  if (!value.body) errors.push('请填写正文');
  else if (value.body.length > 10_000) errors.push('正文最多 10000 字');

  if (!value.topic) errors.push('请选择一个话题');
  if (value.images.length > 6) errors.push('最多上传 6 张图片');
  if (value.images.length > 0 && !value.images.some((image) => image.id === value.coverImageId)) {
    errors.push('请选择并确认一张封面图');
  }

  return errors;
}

export function buildCommunityExcerpt(body: string, limit = 100): string {
  const value = body.replace(/\s+/g, ' ').trim();
  return value.length > limit ? `${value.slice(0, Math.max(1, limit - 1)).trimEnd()}…` : value;
}

export function sortCommunityPosts<
  T extends Pick<CommunityPost, 'likes' | 'comments' | 'publishedAt'>,
>(posts: T[], mode: 'recommended' | 'latest'): T[] {
  return [...posts].sort((a, b) => {
    if (mode === 'latest') return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    const scoreDifference = (b.likes + b.comments * 2) - (a.likes + a.comments * 2);
    return scoreDifference || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}
