import type { CommunityPost } from '@/types/community';
import type {
  Bookmark,
  BrowsingRecord,
  MockUser,
  Note,
  Submission,
} from '@/lib/mockAccountData';

const SESSION_CACHE_PREFIX = 'account-page-cache:v1:';
const memoryCache = new Map<string, string>();

export interface AccountPageSnapshot {
  user: MockUser | null;
  bookmarks: Bookmark[];
  history: BrowsingRecord[];
  submissions: Submission[];
  notes: Note[];
  communityPosts: CommunityPost[];
  communityDrafts: CommunityPost[];
}

function cacheKey(userId: string) {
  return `${SESSION_CACHE_PREFIX}${userId}`;
}

function getSessionStorage() {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}

function parseSnapshot(raw: string): AccountPageSnapshot {
  const value = JSON.parse(raw) as Partial<AccountPageSnapshot> | null;
  if (
    !value
    || (value.user !== null && typeof value.user !== 'object')
    || !Array.isArray(value.bookmarks)
    || !Array.isArray(value.history)
    || !Array.isArray(value.submissions)
    || !Array.isArray(value.notes)
    || !Array.isArray(value.communityPosts)
    || !Array.isArray(value.communityDrafts)
  ) {
    throw new Error('Invalid account page cache');
  }
  return value as AccountPageSnapshot;
}

export function readAccountPageCache(userId: string): AccountPageSnapshot | undefined {
  const key = cacheKey(userId);
  const storage = getSessionStorage();
  let raw: string | null | undefined;

  if (storage) {
    try {
      raw = storage.getItem(key);
    } catch {
      raw = undefined;
    }
  }
  raw ??= memoryCache.get(key);
  if (!raw) return undefined;

  try {
    return parseSnapshot(raw);
  } catch {
    memoryCache.delete(key);
    try {
      storage?.removeItem(key);
    } catch {
      // A blocked storage API should not prevent account rendering.
    }
    return undefined;
  }
}

export function writeAccountPageCache(userId: string, snapshot: AccountPageSnapshot) {
  const key = cacheKey(userId);
  const raw = JSON.stringify(snapshot);
  const storage = getSessionStorage();

  if (storage) {
    try {
      storage.setItem(key, raw);
      memoryCache.delete(key);
      return;
    } catch {
      // Fall back to memory when browser storage is unavailable or full.
    }
  }
  memoryCache.set(key, raw);
}

export function clearAccountPageCache(userId?: string) {
  const storage = getSessionStorage();
  if (userId) {
    const key = cacheKey(userId);
    memoryCache.delete(key);
    try {
      storage?.removeItem(key);
    } catch {
      // A blocked storage API should not prevent memory cleanup.
    }
    return;
  }

  memoryCache.clear();
  if (!storage) return;
  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(SESSION_CACHE_PREFIX)) storage.removeItem(key);
    }
  } catch {
    // A blocked storage API should not prevent memory cleanup.
  }
}
