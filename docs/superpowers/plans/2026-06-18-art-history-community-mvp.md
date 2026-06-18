# 艺史广场 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 React 名录网站中交付一个无需管理员审核的“艺史广场”MVP，打通移动端入口、内容流、长文发布、1–6 图与封面确认、草稿、帖子详情、评论、点赞、收藏和作者自主管理。

**Architecture:** 保持现有 `App.tsx` 的视图状态导航模式，把社区拆成独立页面、组件和 `communityService`。服务层沿用项目现有策略：CloudBase 可用时读写云端，不可用时使用 localStorage；图片在线上上传 CloudBase Storage，本地模式保存压缩后的 data URL。纯规则提取为无 React 依赖的函数，用现有 `sucrase-node` 测试方式覆盖。

**Tech Stack:** React 19、TypeScript、Vite、Tailwind CSS、Lucide React、CloudBase JS SDK、Node `assert` + `sucrase-node`。

---

## File map

**Create**

- `app/src/types/community.ts`：帖子、草稿、图片、评论和互动类型。
- `app/src/lib/communityRules.ts`：校验、摘要、推荐排序、封面和草稿规则。
- `app/src/lib/communityImage.ts`：图片校验、压缩、本地预览与云端上传适配。
- `app/src/lib/communityService.ts`：CloudBase/localStorage 双后端 CRUD。
- `app/src/pages/CommunityFeedPage.tsx`：推荐/最新/话题筛选和发布入口。
- `app/src/pages/CommunityEditorPage.tsx`：长文、草稿、多图排序、封面预览与发布。
- `app/src/pages/CommunityPostPage.tsx`：完整正文、画廊、评论、点赞和收藏。
- `app/src/components/community/CommunityPostCard.tsx`：单列信息流卡片。
- `app/src/components/community/CommunityImageGrid.tsx`：1–6 图选择、排序、删除、封面指定。
- `app/src/components/community/CommunityCoverPreview.tsx`：发布前封面卡片预览。
- `app/src/components/community/CommunityComments.tsx`：帖子评论列表与发表框。
- `app/tests/community-rules.test.ts`：纯规则单元测试。
- `app/tests/community-local-store.test.ts`：本地存储、所有权和互动测试。
- `app/tests/community-navigation.test.ts`：移动底导与 App 路由静态回归测试。

**Modify**

- `app/src/lib/cloudbase.ts`：暴露社区图片上传和临时 URL 能力。
- `app/src/types/cloudbase.ts`：补充社区集合 schema。
- `app/src/App.tsx`：加入 `community`、`community-editor`、`community-post` 视图和登录回跳。
- `app/src/components/MobileBottomNav.tsx`：加入“广场”，改为五等分。
- `app/src/pages/MyAccountPage.tsx`：加入“我的发布”和“我的草稿”。
- `app/package.json`：把三个社区测试加入 `npm test`。
- `README.md`：记录 CloudBase 集合、存储目录和本地回退行为。

## Task 1: Domain types and rules

**Files:**

- Create: `app/src/types/community.ts`
- Create: `app/src/lib/communityRules.ts`
- Create: `app/tests/community-rules.test.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Write the failing rules test**

```ts
// app/tests/community-rules.test.ts
import assert from 'node:assert/strict';
import {
  buildCommunityExcerpt,
  canPublishCommunityDraft,
  normalizeCommunityDraft,
  sortCommunityPosts,
} from '../src/lib/communityRules.ts';

const validDraft = {
  title: ' 重读《美术史十议》 ',
  body: ' 这是一段正文。 ',
  topic: '读书笔记' as const,
  images: [
    { id: 'a', source: 'a.jpg', width: 800, height: 600 },
    { id: 'b', source: 'b.jpg', width: 800, height: 600 },
  ],
  coverImageId: 'b',
};

assert.deepEqual(canPublishCommunityDraft(validDraft), []);
assert.equal(normalizeCommunityDraft(validDraft).title, '重读《美术史十议》');
assert.equal(buildCommunityExcerpt('第一段\n\n第二段', 5), '第一段…');
assert.deepEqual(
  canPublishCommunityDraft({ ...validDraft, coverImageId: '' }),
  ['请选择并确认一张封面图'],
);
assert.deepEqual(
  canPublishCommunityDraft({ ...validDraft, images: Array.from({ length: 7 }, (_, index) => ({ id: String(index), source: '', width: 1, height: 1 })) }),
  ['最多上传 6 张图片', '请选择并确认一张封面图'],
);

const sorted = sortCommunityPosts([
  { id: 'old-hot', likes: 20, comments: 4, publishedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'new', likes: 0, comments: 0, publishedAt: '2026-06-18T00:00:00.000Z' },
], 'latest');
assert.deepEqual(sorted.map((post) => post.id), ['new', 'old-hot']);

console.log('community rule checks passed');
```

- [ ] **Step 2: Register and run the test to verify failure**

Add `sucrase-node tests/community-rules.test.ts` to the start of the `test` script in `app/package.json`.

Run: `cd app && npm test`

Expected: FAIL with `Cannot find module '../src/lib/communityRules.ts'`.

- [ ] **Step 3: Add the domain types**

```ts
// app/src/types/community.ts
export const COMMUNITY_TOPICS = ['读书笔记', '展览现场', '求学经验', '研究方法', '学者与院校'] as const;
export type CommunityTopic = typeof COMMUNITY_TOPICS[number];
export type CommunityPostStatus = 'draft' | 'published' | 'deleted';

export interface CommunityImage {
  id: string;
  source: string;
  fileId?: string;
  width: number;
  height: number;
}

export interface CommunityDraft {
  id?: string;
  title: string;
  body: string;
  topic: CommunityTopic | '';
  images: CommunityImage[];
  coverImageId: string;
  relatedProfessorId?: string;
  relatedUniversity?: string;
}

export interface CommunityPost extends CommunityDraft {
  id: string;
  userId: string;
  nickname: string;
  status: CommunityPostStatus;
  likes: number;
  comments: number;
  bookmarks: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  likedByCurrentUser?: boolean;
  bookmarkedByCurrentUser?: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
}
```

- [ ] **Step 4: Implement minimal rules**

```ts
// app/src/lib/communityRules.ts
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
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

export function sortCommunityPosts<T extends Pick<CommunityPost, 'likes' | 'comments' | 'publishedAt'>>(posts: T[], mode: 'recommended' | 'latest'): T[] {
  return [...posts].sort((a, b) => mode === 'latest'
    ? Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
    : (b.likes + b.comments * 2) - (a.likes + a.comments * 2) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
```

- [ ] **Step 5: Run tests and commit**

Run: `cd app && npm test`

Expected: `community rule checks passed` followed by the existing passing suite.

```bash
git add app/package.json app/src/types/community.ts app/src/lib/communityRules.ts app/tests/community-rules.test.ts
git commit -m "feat: add community domain rules"
```

## Task 2: Local and CloudBase community repository

**Files:**

- Create: `app/src/lib/communityService.ts`
- Create: `app/tests/community-local-store.test.ts`
- Modify: `app/src/types/cloudbase.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Write failing local repository tests**

Create a localStorage stub, import `createCommunityService`, and assert this sequence: save a draft; load it by owner; publish it; list it publicly; reject another user's update/delete; toggle like twice; toggle bookmark twice; add and delete the author's comment. Use fixed `now()` and `id()` dependencies so assertions are deterministic.

```ts
import assert from 'node:assert/strict';
import { createCommunityService } from '../src/lib/communityService.ts';

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
} as Storage;
const validDraft = {
  title: '田野调查准备清单',
  body: '完整正文',
  topic: '求学经验' as const,
  images: [],
  coverImageId: '',
};
const service = createCommunityService({
  storage,
  cloud: null,
  now: () => '2026-06-18T12:00:00.000Z',
  id: (() => { let index = 0; return () => `id-${++index}`; })(),
});
const draft = await service.saveDraft('u1', '林间读画', validDraft);
const post = await service.publishPost('u1', '林间读画', draft.id);
assert.equal((await service.listPublished()).length, 1);
assert.equal(await service.deletePost('u2', post.id), false);
assert.equal((await service.toggleReaction('u1', post.id, 'like')).active, true);
assert.equal((await service.toggleReaction('u1', post.id, 'like')).active, false);
```

- [ ] **Step 2: Run the isolated test to verify failure**

Run: `cd app && npx sucrase-node tests/community-local-store.test.ts`

Expected: FAIL with missing `communityService.ts`.

- [ ] **Step 3: Define CloudBase collection types**

Add `CB_CommunityPost`, `CB_CommunityComment`, and `CB_CommunityReaction` to `app/src/types/cloudbase.ts`. Use the exact domain field names from Task 1; reactions use `reactionType: 'like' | 'bookmark'` and the unique logical key `${userId}:${postId}:${reactionType}`.

- [ ] **Step 4: Implement the repository interface**

```ts
export interface CommunityService {
  listPublished(topic?: CommunityTopic | ''): Promise<CommunityPost[]>;
  getPost(postId: string, userId?: string): Promise<CommunityPost | null>;
  listMine(userId: string, status?: CommunityPostStatus): Promise<CommunityPost[]>;
  saveDraft(userId: string, nickname: string, draft: CommunityDraft): Promise<CommunityPost>;
  publishPost(userId: string, nickname: string, draftId: string): Promise<CommunityPost>;
  updatePost(userId: string, postId: string, draft: CommunityDraft): Promise<CommunityPost | null>;
  deletePost(userId: string, postId: string): Promise<boolean>;
  toggleReaction(userId: string, postId: string, type: 'like' | 'bookmark'): Promise<{ active: boolean }>;
  listComments(postId: string): Promise<CommunityComment[]>;
  addComment(userId: string, nickname: string, postId: string, content: string): Promise<CommunityComment>;
  deleteComment(userId: string, commentId: string): Promise<boolean>;
}
```

Keep local keys `community_posts_v1`, `community_comments_v1`, and `community_reactions_v1`. The default exported service checks `isCloudBaseAvailable()` and maps the same operations to `community_posts`, `community_comments`, and `community_reactions`. All update/delete paths must first compare the stored `userId` to the caller.

- [ ] **Step 5: Run local repository tests and full suite**

Run: `cd app && npx sucrase-node tests/community-local-store.test.ts && npm test`

Expected: repository checks and the full suite PASS.

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/src/types/cloudbase.ts app/src/lib/communityService.ts app/tests/community-local-store.test.ts
git commit -m "feat: add community data service"
```

## Task 3: Image compression, upload, ordering, and cover selection

**Files:**

- Create: `app/src/lib/communityImage.ts`
- Create: `app/src/components/community/CommunityImageGrid.tsx`
- Modify: `app/src/lib/cloudbase.ts`
- Modify: `app/tests/community-rules.test.ts`

- [ ] **Step 1: Add failing image rule tests**

Test that only JPEG/PNG/WebP files are accepted, no more than six images are returned, deleting the active cover selects the next image, and reordering preserves the cover ID.

```ts
assert.equal(validateCommunityImageFile({ type: 'image/gif', size: 10 } as File), '仅支持 JPG、PNG 或 WebP 图片');
assert.equal(validateCommunityImageFile({ type: 'image/jpeg', size: 11 * 1024 * 1024 } as File), '单张图片不能超过 10MB');
assert.equal(removeCommunityImage(images, 'cover', 'cover').coverImageId, 'next');
```

- [ ] **Step 2: Run test and verify failure**

Run: `cd app && npx sucrase-node tests/community-rules.test.ts`

Expected: FAIL with missing image helpers.

- [ ] **Step 3: Extend CloudBase app typing and exports**

Add `uploadFile`, `getTempFileURL`, and `deleteFile` to `CloudBaseApp`. Export wrappers for upload and resolving stored file IDs:

```ts
export async function uploadCommunityImage(file: File, cloudPath: string) {
  const app = await getApp();
  if (!app) throw new Error('CloudBase not initialized');
  const result = await app.uploadFile({ cloudPath, filePath: file });
  const fileId = String(result.fileID || '');
  if (!fileId) throw new Error('Image upload returned no fileID');
  return fileId;
}

export async function resolveCommunityImageUrls(fileIds: string[]) {
  const app = await getApp();
  if (!app || fileIds.length === 0) return {};
  const result = await app.getTempFileURL({ fileList: fileIds });
  return Object.fromEntries(result.fileList.map((item) => [item.fileID, item.tempFileURL]));
}
```

- [ ] **Step 4: Implement image helpers and grid**

`compressCommunityImage(file)` must render through canvas, cap the longest edge at 1600 px, encode JPEG at 0.82 quality, and reject an output over 1 MB. `CommunityImageGrid` accepts `images`, `coverImageId`, `onChange`, and `onCoverChange`; use native pointer events for drag reorder and a hidden multiple file input with `accept="image/jpeg,image/png,image/webp"`.

- [ ] **Step 5: Verify tests and build**

Run: `cd app && npm test && npm run build`

Expected: PASS; TypeScript accepts the CloudBase storage API.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/cloudbase.ts app/src/lib/communityImage.ts app/src/components/community/CommunityImageGrid.tsx app/tests/community-rules.test.ts
git commit -m "feat: add community image and cover flow"
```

## Task 4: Mobile navigation and community feed

**Files:**

- Create: `app/src/components/community/CommunityPostCard.tsx`
- Create: `app/src/pages/CommunityFeedPage.tsx`
- Create: `app/tests/community-navigation.test.ts`
- Modify: `app/src/components/MobileBottomNav.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/package.json`

- [ ] **Step 1: Write failing navigation test**

Read both source files and assert `MobileNavKey` includes `community`, the nav includes `MessageCircleMore` and label `广场`, grid uses five columns, `PublicView` includes `community`, and `App` renders `CommunityFeedPage` for that state.

- [ ] **Step 2: Run test to verify failure**

Run: `cd app && npx sucrase-node tests/community-navigation.test.ts`

Expected: FAIL because the community nav key is absent.

- [ ] **Step 3: Add the fifth bottom-nav item**

Change the type to:

```ts
export type MobileNavKey = 'home' | 'category' | 'community' | 'academies' | 'account';
```

Insert `{ key: 'community', label: '广场', icon: MessageCircleMore }` between 分类 and 院校, and change `grid-cols-4` to `grid-cols-5`.

- [ ] **Step 4: Add feed routing and UI**

Extend App's public view union to include `community`, lazy-load `CommunityFeedPage`, and ensure selecting another bottom item clears any selected community post/editor state. The feed loads `listPublished`, applies `sortCommunityPosts`, filters by the selected topic, renders empty/loading/error states, and exposes `onCreatePost` and `onOpenPost`.

- [ ] **Step 5: Run tests and build**

Run: `cd app && npm test && npm run build`

Expected: PASS and five mobile nav items in the production bundle.

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/src/App.tsx app/src/components/MobileBottomNav.tsx app/src/components/community/CommunityPostCard.tsx app/src/pages/CommunityFeedPage.tsx app/tests/community-navigation.test.ts
git commit -m "feat: add community feed navigation"
```

## Task 5: Long-form editor, manual/automatic drafts, and cover preview

**Files:**

- Create: `app/src/components/community/CommunityCoverPreview.tsx`
- Create: `app/src/pages/CommunityEditorPage.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/tests/community-navigation.test.ts`

- [ ] **Step 1: Add failing editor integration assertions**

Assert the editor source contains limits `60`, `10000`, labels `存草稿`, `草稿已保存`, and `确认封面`; assert App redirects unauthenticated create attempts through `AuthModal` and reopens the editor after login.

- [ ] **Step 2: Run the test to verify failure**

Run: `cd app && npx sucrase-node tests/community-navigation.test.ts`

Expected: FAIL because `CommunityEditorPage.tsx` does not exist.

- [ ] **Step 3: Implement the editor state machine**

Use these explicit states:

```ts
type EditorStage = 'editing' | 'cover-preview' | 'publishing';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
```

Use a textarea with `maxLength={10_000}` and height synchronization `element.style.height = 'auto'; element.style.height = `${element.scrollHeight}px`;`. Debounce automatic `saveDraft` by 2 seconds. Before syncing a draft to CloudBase, upload newly selected compressed images and replace data URLs with `fileId` records; local mode keeps compressed data URLs. The visible “存草稿” button calls the same save function immediately and shows the returned `updatedAt`. Cancel with unsaved changes must show the existing `AlertDialog` pattern with save-and-exit, discard, and continue editing paths. Render the fixed topic choices from `COMMUNITY_TOPICS`, plus optional professor/university selectors populated from the existing dataset.

- [ ] **Step 4: Implement publish and cover confirmation**

Call `canPublishCommunityDraft`. Pure-text posts publish directly. Posts with images move to `cover-preview`; only its “确认并发布” action ensures every pending image is uploaded, writes final order and cover ID, then calls `publishPost`. Disable all submit controls while publishing to prevent duplicates.

- [ ] **Step 5: Verify tests and build**

Run: `cd app && npm test && npm run build`

Expected: PASS; editor compiles with no React hook warnings.

- [ ] **Step 6: Commit**

```bash
git add app/src/App.tsx app/src/pages/CommunityEditorPage.tsx app/src/components/community/CommunityCoverPreview.tsx app/tests/community-navigation.test.ts
git commit -m "feat: add community editor and drafts"
```

## Task 6: Post detail, comments, likes, and bookmarks

**Files:**

- Create: `app/src/components/community/CommunityComments.tsx`
- Create: `app/src/pages/CommunityPostPage.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/tests/community-local-store.test.ts`

- [ ] **Step 1: Extend failing ownership and interaction tests**

Assert unauthenticated reactions are rejected by the page handler, one user cannot create duplicate like/bookmark records, only a comment owner can delete their comment, and only a post owner can edit/delete their post.

- [ ] **Step 2: Run the repository test to verify failure**

Run: `cd app && npx sucrase-node tests/community-local-store.test.ts`

Expected: FAIL on the new ownership or reaction assertion.

- [ ] **Step 3: Implement detail and gallery**

Load the post by ID; render preserved paragraphs with `whitespace-pre-wrap`, all images in saved order, and a fullscreen dialog opened from each image. Render related scholar/university only when present. If status is deleted or the record is missing, show a single “内容已删除或不存在” state with a return button.

- [ ] **Step 4: Implement interactions**

Comments require login and non-empty content up to 1000 characters. Like and bookmark call `toggleReaction` and update the card optimistically, rolling back on failure. Author controls call delete only after `AlertDialog` confirmation; after deletion return to the feed.

- [ ] **Step 5: Run tests and build**

Run: `cd app && npm test && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/App.tsx app/src/pages/CommunityPostPage.tsx app/src/components/community/CommunityComments.tsx app/tests/community-local-store.test.ts
git commit -m "feat: add community post interactions"
```

## Task 7: My posts and my drafts

**Files:**

- Modify: `app/src/pages/MyAccountPage.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/tests/community-navigation.test.ts`

- [ ] **Step 1: Add failing account assertions**

Assert `MyAccountPage` loads both `listMine(userId, 'published')` and `listMine(userId, 'draft')`, displays headings `我的发布` and `我的草稿`, and exposes edit/delete callbacks rather than manipulating storage directly.

- [ ] **Step 2: Run test and verify failure**

Run: `cd app && npx sucrase-node tests/community-navigation.test.ts`

Expected: FAIL on missing community account sections.

- [ ] **Step 3: Implement account sections**

Load posts with existing account data in `Promise.all`. Each published row shows title, topic, published time, and “查看/编辑/删除”. Each draft shows title fallback `未命名草稿`, updated time, optional cover thumbnail, and “继续编辑/删除”. Add callbacks to `MyAccountPage` props so App owns navigation.

- [ ] **Step 4: Run tests and build**

Run: `cd app && npm test && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx app/src/pages/MyAccountPage.tsx app/tests/community-navigation.test.ts
git commit -m "feat: add community content to account"
```

## Task 8: CloudBase setup notes and final verification

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Document deployment prerequisites**

Add collections `community_posts`, `community_comments`, and `community_reactions`; document indexes for `status + publishedAt`, `topic + publishedAt`, `userId + updatedAt`, and `postId + createdAt`. Document storage prefix `community/{userId}/{postId}/` and that collection/storage permissions must allow public reads of published posts and owner-only writes.

- [ ] **Step 2: Run complete automated verification**

Run: `cd app && npm test && npm run lint && npm run build`

Expected: all commands exit 0.

- [ ] **Step 3: Run mobile browser QA**

At 390 × 844 verify: bottom nav has five non-overlapping items; unauthenticated publish opens login; pure-text publish appears immediately; six images are accepted and the seventh rejected; cover can be changed; a saved draft survives reload; a 10,000-character body remains editable; like/bookmark toggles do not duplicate; another account cannot delete the post.

- [ ] **Step 4: Run regression QA**

Verify desktop home, category, academies, professor modal, existing professor comments, supplement flow, notifications, and account bookmarks still open and scroll correctly.

- [ ] **Step 5: Commit docs**

```bash
git add README.md
git commit -m "docs: add community CloudBase setup"
```
