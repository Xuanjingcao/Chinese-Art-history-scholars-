# Community Feed Inline Like Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让登录用户在广场卡片上无刷新点赞/取消点赞，未登录用户则打开现有登录窗口。

**Architecture:** `CommunityFeedPage` 拥有列表点赞状态，通过纯函数对单条帖子执行幂等的乐观更新，并在 CloudBase 失败时回滚。`CommunityPostCard` 改为语义化容器，分离打开详情与点赞按钮；`App` 仅传入已有用户和登录回调。

**Tech Stack:** React 19、TypeScript、CloudBase JS SDK、Node `assert` + `sucrase-node`、Vite、本地 Browser QA

---

## File Structure

- Create `app/src/lib/communityFeedReactions.ts`: 广场列表单条点赞状态的纯函数更新。
- Create `app/tests/community-feed-reactions.test.ts`: 点赞、取消、幂等和非目标帖子不变的回归测试。
- Modify `app/package.json`: 将新回归测试加入默认 `npm test`。
- Modify `app/src/components/community/CommunityPostCard.tsx`: 独立的卡片打开区和点赞按钮。
- Modify `app/src/pages/CommunityFeedPage.tsx`: 当前用户加载、乐观更新、单帖锁定、CloudBase 对账与失败回滚。
- Modify `app/src/App.tsx`: 传入 `currentUser` 和现有的登录窗口回调。
- Modify `app/tests/community-navigation.test.ts`: 检查卡片点赞与登录数据流已接线。

### Task 1: Pure optimistic like state

**Files:**
- Create: `app/src/lib/communityFeedReactions.ts`
- Create: `app/tests/community-feed-reactions.test.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Write the failing state-transition test**

```ts
import assert from 'node:assert/strict';
import { setCommunityPostLike } from '../src/lib/communityFeedReactions.ts';

const posts = [{ id: 'p1', likes: 2, likedByCurrentUser: false }, { id: 'p2', likes: 7 }];
const liked = setCommunityPostLike(posts, 'p1', true);
assert.deepEqual(liked[0], { id: 'p1', likes: 3, likedByCurrentUser: true });
assert.equal(liked[1], posts[1]);
assert.equal(setCommunityPostLike(liked, 'p1', true)[0].likes, 3);
assert.equal(setCommunityPostLike([{ id: 'p1', likes: 0, likedByCurrentUser: true }], 'p1', false)[0].likes, 0);
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `cd app && npm exec -- sucrase-node tests/community-feed-reactions.test.ts`

Expected: FAIL because `communityFeedReactions.ts` does not exist.

- [ ] **Step 3: Implement the minimal immutable transition**

```ts
export function setCommunityPostLike<
  T extends { id: string; likes: number; likedByCurrentUser?: boolean },
>(posts: T[], postId: string, active: boolean): T[] {
  return posts.map((post) => {
    if (post.id !== postId || Boolean(post.likedByCurrentUser) === active) return post;
    return {
      ...post,
      likedByCurrentUser: active,
      likes: Math.max(0, post.likes + (active ? 1 : -1)),
    };
  });
}
```

- [ ] **Step 4: Add the test to the default test command and confirm GREEN**

Add `sucrase-node tests/community-feed-reactions.test.ts` immediately after the existing community tests in `app/package.json`.

Run: `cd app && npm exec -- sucrase-node tests/community-feed-reactions.test.ts`

Expected: `community feed reaction checks passed` and exit code 0.

- [ ] **Step 5: Commit the state helper**

```bash
git add app/src/lib/communityFeedReactions.ts app/tests/community-feed-reactions.test.ts app/package.json
git commit -m "test: cover optimistic community likes"
```

### Task 2: Card interaction boundaries

**Files:**
- Modify: `app/src/components/community/CommunityPostCard.tsx`
- Modify: `app/tests/community-navigation.test.ts`

- [ ] **Step 1: Add failing source-contract assertions**

```ts
const cardSource = readFileSync(new URL('../src/components/community/CommunityPostCard.tsx', import.meta.url), 'utf8');
assert.match(cardSource, /onLike: \(post: CommunityPost\) => void/);
assert.match(cardSource, /aria-pressed=\{Boolean\(post\.likedByCurrentUser\)\}/);
assert.match(cardSource, /aria-label=\{post\.likedByCurrentUser \? '取消点赞' : '点赞'\}/);
assert.doesNotMatch(cardSource, /return \(\s*<button[\s\S]*className="w-full overflow-hidden/);
```

- [ ] **Step 2: Run the navigation test and confirm RED**

Run: `cd app && npm exec -- sucrase-node tests/community-navigation.test.ts`

Expected: FAIL because `CommunityPostCard` has no `onLike` prop or independent like button.

- [ ] **Step 3: Split navigation and like controls**

Change `CommunityPostCard` props to:

```ts
{
  post: CommunityPost;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
  likePending: boolean;
  likeError?: string;
}
```

Render an outer `<article>` with the existing card styles. Put the author/title/body/cover content in one `type="button"` control that calls `onOpen(post)`. Render the footer outside that button and use this like button:

```tsx
<button
  type="button"
  disabled={likePending}
  aria-pressed={Boolean(post.likedByCurrentUser)}
  aria-label={post.likedByCurrentUser ? '取消点赞' : '点赞'}
  onClick={() => onLike(post)}
  className="inline-flex items-center gap-1 disabled:opacity-50"
  style={{ color: post.likedByCurrentUser ? '#a13b32' : '#87796a' }}
>
  <Heart size={14} fill={post.likedByCurrentUser ? 'currentColor' : 'none'} />
  {post.likes}
</button>
```

Show `likeError` beneath the footer in a compact red `role="status"` message. Preserve the existing comment count and bookmark icon as non-interactive display elements.

- [ ] **Step 4: Run the navigation test and confirm GREEN**

Run: `cd app && npm exec -- sucrase-node tests/community-navigation.test.ts`

Expected: `community navigation checks passed` and exit code 0.

- [ ] **Step 5: Commit the card boundary**

```bash
git add app/src/components/community/CommunityPostCard.tsx app/tests/community-navigation.test.ts
git commit -m "feat: add inline like control to community cards"
```

### Task 3: Feed optimistic mutation and login gate

**Files:**
- Modify: `app/src/pages/CommunityFeedPage.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/tests/community-navigation.test.ts`

- [ ] **Step 1: Add failing feed-wiring assertions**

```ts
assert.match(feedSource, /currentUser: AuthUser \| null/);
assert.match(feedSource, /onLoginClick: \(\) => void/);
assert.match(feedSource, /listPublished\(topic, currentUser\?\.userId\)/);
assert.match(feedSource, /toggleReaction\(currentUser\.userId, post\.id, 'like'\)/);
assert.match(feedSource, /setCommunityPostLike/);
assert.match(appSource, /currentUser=\{currentUser\}/);
assert.match(appSource, /onLoginClick=\{\(\) => setShowAuth\(true\)\}/);
```

- [ ] **Step 2: Run the navigation test and confirm RED**

Run: `cd app && npm exec -- sucrase-node tests/community-navigation.test.ts`

Expected: FAIL because the feed does not receive the user or login callback.

- [ ] **Step 3: Extend published-list loading with user reaction state**

Update `CommunityService.listPublished` to accept an optional `userId` and enrich every published post with `likedByCurrentUser`/`bookmarkedByCurrentUser`, matching the existing `getPost` behavior. Local storage should use `withUserReactions`; CloudBase should query the current user's reactions for the returned post IDs and merge them into the posts. Keep the topic filter unchanged.

Update the interface signature to:

```ts
listPublished(topic?: CommunityTopic | '', userId?: string): Promise<CommunityPost[]>;
```

Call it from the feed with:

```ts
communityService?.listPublished(topic, currentUser?.userId)
```

- [ ] **Step 4: Implement per-post optimistic likes without list reload**

Add:

```ts
const [likePendingIds, setLikePendingIds] = useState<Set<string>>(() => new Set());
const [likeErrors, setLikeErrors] = useState<Record<string, string>>({});
```

Implement `toggleLike(post)` as follows:

```ts
if (!currentUser) { onLoginClick(); return; }
if (!communityService || likePendingIds.has(post.id)) return;
const previousActive = Boolean(post.likedByCurrentUser);
const nextActive = !previousActive;
setPosts((value) => setCommunityPostLike(value, post.id, nextActive));
setLikeErrors((value) => ({ ...value, [post.id]: '' }));
setLikePendingIds((value) => new Set(value).add(post.id));
try {
  const result = await communityService.toggleReaction(currentUser.userId, post.id, 'like');
  setPosts((value) => setCommunityPostLike(value, post.id, result.active));
} catch {
  setPosts((value) => setCommunityPostLike(value, post.id, previousActive));
  setLikeErrors((value) => ({ ...value, [post.id]: '点赞失败，请重试' }));
} finally {
  setLikePendingIds((value) => {
    const next = new Set(value);
    next.delete(post.id);
    return next;
  });
}
```

Pass `onLike`, `likePending`, and `likeError` into each `CommunityPostCard`. Do not call `loadPosts` from `toggleLike`.

- [ ] **Step 5: Wire App login state and confirm GREEN**

Pass these props into `CommunityFeedPage`:

```tsx
currentUser={currentUser}
onLoginClick={() => setShowAuth(true)}
```

Run: `cd app && npm exec -- sucrase-node tests/community-navigation.test.ts && npm exec -- sucrase-node tests/community-feed-reactions.test.ts`

Expected: both tests pass.

- [ ] **Step 6: Commit the feed data flow**

```bash
git add app/src/pages/CommunityFeedPage.tsx app/src/App.tsx app/src/lib/communityService.ts app/tests/community-navigation.test.ts
git commit -m "feat: like community posts without refreshing"
```

### Task 4: Full verification and localhost QA

**Files:**
- Verify only; do not add generated artifacts.

- [ ] **Step 1: Run all automated checks**

Run: `cd app && npm test && npm run build`

Expected: all test scripts pass; TypeScript and Vite production build exit 0.

- [ ] **Step 2: Start safe local mode**

Run: `cd app && VITE_DISABLE_CLOUDBASE=true npm run dev -- --host 127.0.0.1`

Expected: Vite serves `http://127.0.0.1:3000/` and the header shows `本地模式`.

- [ ] **Step 3: Verify logged-out behavior**

Open the mobile viewport, enter `广场`, and click a card heart while logged out.

Expected: login modal opens; heart state/count do not change; the card does not navigate.

- [ ] **Step 4: Verify logged-in optimistic behavior**

Register a disposable local-only account, ensure a local published fixture exists, then click the card heart once.

Expected: heart fill and count change in place; scroll position and card list remain stable; no document navigation occurs. Click again and expect the state/count to return.

- [ ] **Step 5: Check desktop/mobile rendering and console**

Use 390×844 and 1280×720 viewports. Confirm page identity, no blank screen, no framework overlay, no relevant console errors, and no nested-button accessibility issue. Capture screenshots outside the repository.

- [ ] **Step 6: Review the final diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended source/test changes plus the user's pre-existing uncommitted files are present.
