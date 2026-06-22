# Production Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the production site's avoidable CloudBase startup and community-feed latency without changing user-visible data semantics.

**Architecture:** Remove the homepage's eager database health probe, run independent community post and reaction reads concurrently, and add a small in-memory feed cache keyed by topic and user. The feed renders cached data immediately, refreshes it in the background, and keeps cached content visible when refresh fails.

**Tech Stack:** React 19, TypeScript, Vite, CloudBase JS SDK, Node assert tests executed with `sucrase-node`.

---

### Task 1: Add an isolated community feed session cache

**Files:**
- Create: `app/src/lib/communityFeedCache.ts`
- Create: `app/tests/community-feed-cache.test.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Write the failing cache test**

Create `app/tests/community-feed-cache.test.ts`:

```ts
import assert from 'node:assert/strict';
import {
  clearCommunityFeedCache,
  readCommunityFeedCache,
  writeCommunityFeedCache,
} from '../src/lib/communityFeedCache.ts';

const post = {
  id: 'p1', userId: 'u1', nickname: '测试', title: '缓存测试', body: '正文',
  topic: '研究方法' as const, images: [], coverImageId: '', status: 'published' as const,
  likes: 1, comments: 0, bookmarks: 0, createdAt: '2026-06-22',
  updatedAt: '2026-06-22', publishedAt: '2026-06-22', likedByCurrentUser: true,
};

clearCommunityFeedCache();
assert.equal(readCommunityFeedCache('', 'u1'), undefined);
writeCommunityFeedCache('', 'u1', [post]);
assert.deepEqual(readCommunityFeedCache('', 'u1'), [post]);
assert.equal(readCommunityFeedCache('研究方法', 'u1'), undefined);
assert.equal(readCommunityFeedCache('', 'u2'), undefined);

const cached = readCommunityFeedCache('', 'u1')!;
cached[0].likes = 99;
assert.equal(readCommunityFeedCache('', 'u1')![0].likes, 1);

clearCommunityFeedCache();
assert.equal(readCommunityFeedCache('', 'u1'), undefined);
console.log('community feed cache checks passed');
```

Add `sucrase-node tests/community-feed-cache.test.ts` immediately after the reaction test in the `test` script.

- [ ] **Step 2: Run the cache test and verify RED**

Run:

```bash
cd app
npx sucrase-node tests/community-feed-cache.test.ts
```

Expected: FAIL because `communityFeedCache.ts` does not exist.

- [ ] **Step 3: Implement the minimal cache module**

Create `app/src/lib/communityFeedCache.ts`:

```ts
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
```

- [ ] **Step 4: Run the cache test and verify GREEN**

Run: `npx sucrase-node tests/community-feed-cache.test.ts`

Expected: `community feed cache checks passed`.

- [ ] **Step 5: Commit the cache unit**

```bash
git add app/src/lib/communityFeedCache.ts app/tests/community-feed-cache.test.ts app/package.json
git commit -m "feat: cache community feeds per session"
```

### Task 2: Remove the homepage's eager CloudBase health request

**Files:**
- Modify: `app/src/sections/Header.tsx`
- Create: `app/tests/production-performance.test.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Write the failing homepage performance assertion**

Create `app/tests/production-performance.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const headerSource = readFileSync(new URL('../src/sections/Header.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(headerSource, /getCloudBaseHealth/);
assert.match(headerSource, /getBrowserCloudBaseConfig\(\)\.enabled/);
assert.match(headerSource, /CloudBase 已启用/);
console.log('production performance checks passed');
```

Add `sucrase-node tests/production-performance.test.ts` after the cache test in `app/package.json`.

- [ ] **Step 2: Run the source assertion and verify RED**

Run: `npx sucrase-node tests/production-performance.test.ts`

Expected: FAIL because `Header.tsx` still imports and calls `getCloudBaseHealth`.

- [ ] **Step 3: Make the status badge configuration-only**

In `app/src/sections/Header.tsx`:

- Remove `getCloudBaseHealth` and `CloudBaseHealth` imports.
- Replace the `BackendStatus` state and effect with a configuration-only branch:

```tsx
function BackendStatus() {
  const cloudEnabled = getBrowserCloudBaseConfig().enabled;
  const copy = cloudEnabled
    ? {
        label: '云端后台',
        title: 'CloudBase 已启用；云端功能会在实际使用时连接。',
        color: '#3f6b4a',
        bg: 'rgba(240,248,239,0.78)',
        Icon: Cloud,
      }
    : {
        label: '本地模式',
        title: '当前使用浏览器本地缓存。若要连接 CloudBase，请在 .env.local 设置 VITE_ENABLE_CLOUDBASE=true 后重启 npm run dev。',
        color: '#7c6d5a',
        bg: 'rgba(255,255,255,0.58)',
        Icon: CloudOff,
      };
  const Icon = copy.Icon;

  return (
    <div
      className="absolute left-4 top-4 z-20 inline-flex h-[34px] items-center gap-1.5 rounded-lg px-2.5 font-kai text-xs"
      style={{
        color: copy.color,
        backgroundColor: copy.bg,
        border: '1px solid rgba(92,64,48,0.12)',
        backdropFilter: 'blur(10px)',
      }}
      title={copy.title}
    >
      <Icon size={14} />
      <span>{copy.label}</span>
    </div>
  );
}
```

Keep the existing `useEffect` import because the header still uses it for outside-click handling.

- [ ] **Step 4: Run the focused assertion**

Run: `npx sucrase-node tests/production-performance.test.ts`

Expected: `production performance checks passed`.

- [ ] **Step 5: Commit the homepage change**

```bash
git add app/src/sections/Header.tsx app/tests/production-performance.test.ts app/package.json
git commit -m "perf: defer CloudBase checks until needed"
```

### Task 3: Start community post and reaction queries concurrently

**Files:**
- Create: `app/src/lib/communityFeedQueries.ts`
- Create: `app/tests/community-feed-queries.test.ts`
- Modify: `app/src/lib/communityService.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Write a failing concurrency test**

Create `app/tests/community-feed-queries.test.ts`:

```ts
import assert from 'node:assert/strict';
import { runCommunityFeedQueries } from '../src/lib/communityFeedQueries.ts';

const started: string[] = [];
let resolvePosts!: (value: string[]) => void;
let resolveReactions!: (value: number[]) => void;

const resultPromise = runCommunityFeedQueries(
  () => new Promise<string[]>((resolve) => { started.push('posts'); resolvePosts = resolve; }),
  () => new Promise<number[]>((resolve) => { started.push('reactions'); resolveReactions = resolve; }),
);

assert.deepEqual(started, ['posts', 'reactions']);
resolvePosts(['p1']);
resolveReactions([1]);
assert.deepEqual(await resultPromise, { posts: ['p1'], reactions: [1] });

assert.deepEqual(
  await runCommunityFeedQueries(async () => ['guest-post']),
  { posts: ['guest-post'], reactions: [] },
);
console.log('community feed query checks passed');
```

Add this test after `community-feed-cache.test.ts` in the package test script.
Also extend `app/tests/production-performance.test.ts` with:

```ts
const serviceSource = readFileSync(new URL('../src/lib/communityService.ts', import.meta.url), 'utf8');
assert.match(serviceSource, /runCommunityFeedQueries/);
```

- [ ] **Step 2: Run the query test and verify RED**

Run: `npx sucrase-node tests/community-feed-queries.test.ts`

Expected: FAIL because `communityFeedQueries.ts` does not exist.

- [ ] **Step 3: Implement the concurrency helper**

Create `app/src/lib/communityFeedQueries.ts`:

```ts
export async function runCommunityFeedQueries<TPost, TReaction>(
  loadPosts: () => Promise<TPost[]>,
  loadReactions?: () => Promise<TReaction[]>,
) {
  if (!loadReactions) {
    return { posts: await loadPosts(), reactions: [] as TReaction[] };
  }

  const [posts, reactions] = await Promise.all([loadPosts(), loadReactions()]);
  return { posts, reactions };
}
```

- [ ] **Step 4: Use the helper in CloudBase `listPublished`**

Import `runCommunityFeedQueries` in `app/src/lib/communityService.ts`. Replace the sequential reads with:

```ts
const { posts: records, reactions: reactionRecords } = await runCommunityFeedQueries(
  async () => {
    const result = await db.collection('community_posts')
      .where(where)
      .orderBy('publishedAt', 'desc')
      .limit(100)
      .get();
    return result.data;
  },
  userId
    ? async () => (await db.collection('community_reactions').where({ userId }).limit(1000).get()).data
    : undefined,
);
const posts = await Promise.all(records.map(recordToPost));
if (!userId || posts.length === 0) return posts;
const postIds = new Set(posts.map((post) => post.id));
const relevant = reactionRecords.filter((item) => postIds.has(stringValue(item.postId)));
```

- [ ] **Step 5: Verify query and source tests GREEN**

Run:

```bash
npx sucrase-node tests/community-feed-queries.test.ts
npx sucrase-node tests/production-performance.test.ts
```

Expected: both tests pass.

- [ ] **Step 6: Commit concurrent loading**

```bash
git add app/src/lib/communityFeedQueries.ts app/src/lib/communityService.ts app/tests/community-feed-queries.test.ts
git commit -m "perf: parallelize community feed queries"
```

### Task 4: Render cached feeds immediately and refresh in the background

**Files:**
- Modify: `app/src/pages/CommunityFeedPage.tsx`
- Modify: `app/tests/community-navigation.test.ts`

- [ ] **Step 1: Add failing page integration assertions**

Append to `app/tests/community-navigation.test.ts`:

```ts
assert.match(feedSource, /readCommunityFeedCache/);
assert.match(feedSource, /writeCommunityFeedCache/);
assert.match(feedSource, /const cached = readCommunityFeedCache\(topic, currentUser\?\.userId\)/);
assert.match(feedSource, /setLoading\(!cached\)/);
assert.match(feedSource, /writeCommunityFeedCache\(topic, currentUser\?\.userId, nextPosts\)/);
```

- [ ] **Step 2: Run navigation checks and verify RED**

Run: `npx sucrase-node tests/community-navigation.test.ts`

Expected: FAIL because the page does not import or use the cache.

- [ ] **Step 3: Initialize and refresh from the session cache**

In `CommunityFeedPage.tsx`, import the cache helpers and change `loadPosts` to:

```ts
const [posts, setPosts] = useState<CommunityPost[]>(
  () => readCommunityFeedCache('', currentUser?.userId) || [],
);
const [loading, setLoading] = useState(
  () => !readCommunityFeedCache('', currentUser?.userId),
);

const loadPosts = useCallback(async () => {
  const cached = readCommunityFeedCache(topic, currentUser?.userId);
  if (cached) setPosts(cached);
  setLoading(!cached);
  setError('');

  try {
    const nextPosts = await communityService?.listPublished(topic, currentUser?.userId) || [];
    setPosts(nextPosts);
    writeCommunityFeedCache(topic, currentUser?.userId, nextPosts);
  } catch {
    setError(cached ? '内容刷新失败，当前显示上次结果' : '暂时无法加载广场内容，请稍后重试');
  } finally {
    setLoading(false);
  }
}, [currentUser?.userId, topic]);
```

Adjust rendering so an error message does not suppress existing cards:

```tsx
{!loading && error ? <div className="py-4 text-center"><p className="font-kai text-sm" style={{ color: '#a13b32' }}>{error}</p>{posts.length === 0 ? <button type="button" onClick={() => void loadPosts()} className="mt-3 font-kai text-xs underline">重新加载</button> : null}</div> : null}
{!loading && !error && posts.length === 0 ? <p className="py-16 text-center font-kai text-sm" style={{ color: '#9b8c7b' }}>还没有内容，来写下第一篇吧。</p> : null}
{!loading ? sortCommunityPosts(posts, mode).map((post) => (
  <CommunityPostCard
    key={post.id}
    post={post}
    onOpen={onOpenPost}
    onLike={(item) => void toggleLike(item)}
    likePending={likePendingIds.has(post.id)}
    likeError={likeErrors[post.id]}
  />
)) : null}
```

- [ ] **Step 4: Keep optimistic likes synchronized with the cache**

Add a local update helper:

```ts
const applyLikeState = (postId: string, active: boolean) => {
  setPosts((value) => {
    const nextPosts = setCommunityPostLike(value, postId, active);
    writeCommunityFeedCache(topic, currentUser?.userId, nextPosts);
    return nextPosts;
  });
};
```

Use `applyLikeState` for optimistic state, server reconciliation, and rollback inside `toggleLike`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npx sucrase-node tests/community-navigation.test.ts
npx sucrase-node tests/community-feed-cache.test.ts
npx sucrase-node tests/community-feed-reactions.test.ts
```

Expected: all focused checks pass.

- [ ] **Step 6: Commit the cached feed integration**

```bash
git add app/src/pages/CommunityFeedPage.tsx app/tests/community-navigation.test.ts
git commit -m "perf: refresh community feeds from session cache"
```

### Task 5: Full verification and localhost performance QA

**Files:**
- No production files expected.

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
cd app
npm test
npm run build
```

Expected: all test scripts pass and Vite completes the production build.

- [ ] **Step 2: Check formatting and workspace scope**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only intentional files are changed.

- [ ] **Step 3: Run localhost browser QA**

Start with `npm run dev -- --host 127.0.0.1`, then use the in-app Browser at `http://127.0.0.1:3000/`.

Verify:

- The home page renders without a framework overlay or console warning.
- The status badge says `云端后台` when CloudBase is configured, but no automatic health request is initiated by the badge.
- First entry to the community shows the loading state and then posts.
- Return home and enter the community again; cached posts are immediately present while the refresh runs.
- A like still changes count without navigation or page refresh.
- Console contains no relevant error or warning.

- [ ] **Step 4: Record the remaining deployment limitation**

Report that code-level request waterfalls and repeated feed waits are addressed, but CloudBase static hosting still requires separate cache/compression configuration for `/assets/*` before the production site's repeat-load performance can fully improve.
