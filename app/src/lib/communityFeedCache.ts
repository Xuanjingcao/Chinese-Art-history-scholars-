import type { CommunityPost, CommunityTopic } from '@/types/community';

const feedCache = new Map<string, CommunityPost[]>();

function cacheKey(topic: CommunityTopic | '', userId?: string) {
  return `${userId || 'guest'}::${topic || 'all'}`;
}

function clonePosts(posts: CommunityPost[]) {
  return posts.map((post) => ({
    ...post,
    images: post.images.map((image) => ({ ...image })),
  }));
}

export function readCommunityFeedCache(topic: CommunityTopic | '', userId?: string) {
  const posts = feedCache.get(cacheKey(topic, userId));
  return posts ? clonePosts(posts) : undefined;
}

export function writeCommunityFeedCache(
  topic: CommunityTopic | '',
  userId: string | undefined,
  posts: CommunityPost[],
) {
  feedCache.set(cacheKey(topic, userId), clonePosts(posts));
}

export function clearCommunityFeedCache() {
  feedCache.clear();
}
