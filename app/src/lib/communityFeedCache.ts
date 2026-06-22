import type { CommunityPost, CommunityTopic } from '@/types/community';

const feedCache = new Map<string, CommunityPost[]>();
const SESSION_CACHE_PREFIX = 'community-feed-cache:v1:';

function cacheKey(topic: CommunityTopic | '', userId?: string) {
  return `${userId || 'guest'}::${topic || 'all'}`;
}

function clonePosts(posts: CommunityPost[]) {
  return posts.map((post) => ({
    ...post,
    images: post.images.map((image) => ({ ...image })),
  }));
}

function sessionCacheKey(topic: CommunityTopic | '', userId?: string) {
  return `${SESSION_CACHE_PREFIX}${cacheKey(topic, userId)}`;
}

function getSessionStorage() {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}

export function readCommunityFeedCache(topic: CommunityTopic | '', userId?: string) {
  const storage = getSessionStorage();
  const storageKey = sessionCacheKey(topic, userId);
  if (storage) {
    try {
      const raw = storage.getItem(storageKey);
      if (raw) {
        const storedPosts = JSON.parse(raw);
        if (!Array.isArray(storedPosts)) throw new Error('Invalid community feed cache');
        return clonePosts(storedPosts as CommunityPost[]);
      }
    } catch {
      storage.removeItem(storageKey);
    }
  }

  const posts = feedCache.get(cacheKey(topic, userId));
  return posts ? clonePosts(posts) : undefined;
}

export function writeCommunityFeedCache(
  topic: CommunityTopic | '',
  userId: string | undefined,
  posts: CommunityPost[],
) {
  const clonedPosts = clonePosts(posts);
  const storage = getSessionStorage();
  if (storage) {
    try {
      storage.setItem(sessionCacheKey(topic, userId), JSON.stringify(clonedPosts));
      return;
    } catch {
      // Fall back to memory when browser storage is unavailable or full.
    }
  }
  feedCache.set(cacheKey(topic, userId), clonedPosts);
}

export function clearCommunityFeedCache() {
  feedCache.clear();
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(SESSION_CACHE_PREFIX)) storage.removeItem(key);
    }
  } catch {
    // A blocked storage API should not prevent memory cache cleanup.
  }
}
