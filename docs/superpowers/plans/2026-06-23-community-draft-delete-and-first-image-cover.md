# Community Draft Delete and First Image Cover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users delete saved community drafts from the account page and make the first image automatically become the post cover without a manual cover-selection click.

**Architecture:** Keep image ordering and cover identity as one atomic state transition to avoid stale React state overwrites. Reuse the existing `communityService.deletePost(userId, postId)` API for draft deletion and update the account page list optimistically only after the service confirms success.

**Tech Stack:** React 19, TypeScript, Vite, local `sucrase-node` assertion tests, existing community service/storage helpers.

---

## File Structure

- Modify `app/src/lib/communityImage.ts`
  - Add a pure helper that always derives `coverImageId` from `images[0]?.id || ''`.
  - Update deletion helper to follow the first-image-is-cover invariant.
- Modify `app/src/components/community/CommunityImageGrid.tsx`
  - Emit `{ images, coverImageId }` in a single callback.
  - Remove manual “设为封面” action and show a passive cover badge on the first image.
- Modify `app/src/pages/CommunityEditorPage.tsx`
  - Use functional `setDraft` and apply image/cover updates atomically.
- Modify `app/src/pages/MyAccountPage.tsx`
  - Add draft deletion handler, error state, confirm dialog, delete button, and list update.
- Modify `app/tests/community-navigation.test.ts`
  - Add source checks for the draft deletion UI and account deletion handler.
- Create `app/tests/community-image.test.ts`
  - Test pure first-image cover behavior without browser APIs.
- Modify `app/package.json`
  - Include `community-image.test.ts` in `npm test`.

## Task 1: Pure image cover invariant

**Files:**
- Create: `app/tests/community-image.test.ts`
- Modify: `app/src/lib/communityImage.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Write the failing test**

Create `app/tests/community-image.test.ts`:

```ts
import assert from 'node:assert/strict';
import {
  createCommunityImageState,
  removeCommunityImage,
  reorderCommunityImages,
} from '../src/lib/communityImage.ts';
import type { CommunityImage } from '../src/types/community.ts';

const image = (id: string): CommunityImage => ({
  id,
  source: `data:image/jpeg;base64,${id}`,
  width: 100,
  height: 100,
});

const first = image('first');
const second = image('second');
const third = image('third');

assert.deepEqual(createCommunityImageState([first, second]), {
  images: [first, second],
  coverImageId: 'first',
});

assert.deepEqual(createCommunityImageState([]), {
  images: [],
  coverImageId: '',
});

const reordered = reorderCommunityImages([first, second, third], 'third', 'first');
assert.deepEqual(createCommunityImageState(reordered), {
  images: [third, first, second],
  coverImageId: 'third',
});

assert.deepEqual(removeCommunityImage([first, second], 'first'), {
  images: [second],
  coverImageId: 'second',
});

console.log('community image cover checks passed');
```

Update `app/package.json` so `"test"` starts with:

```json
"test": "sucrase-node tests/community-image.test.ts && sucrase-node tests/community-rules.test.ts && ..."
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd app && npx sucrase-node tests/community-image.test.ts
```

Expected: FAIL because `createCommunityImageState` is not exported and `removeCommunityImage` still expects the old cover argument.

- [ ] **Step 3: Write minimal implementation**

Update `app/src/lib/communityImage.ts`:

```ts
export function createCommunityImageState(images: CommunityImage[]): { images: CommunityImage[]; coverImageId: string } {
  return {
    images,
    coverImageId: images[0]?.id || '',
  };
}

export function removeCommunityImage(
  images: CommunityImage[],
  imageId: string,
): { images: CommunityImage[]; coverImageId: string } {
  return createCommunityImageState(images.filter((image) => image.id !== imageId));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd app && npx sucrase-node tests/community-image.test.ts
```

Expected: PASS with `community image cover checks passed`.

## Task 2: Atomic image grid updates

**Files:**
- Modify: `app/src/components/community/CommunityImageGrid.tsx`
- Modify: `app/src/pages/CommunityEditorPage.tsx`
- Modify: `app/tests/community-navigation.test.ts`

- [ ] **Step 1: Write failing source checks**

Add to `app/tests/community-navigation.test.ts` near existing editor assertions:

```ts
const imageGridSource = readFileSync(new URL('../src/components/community/CommunityImageGrid.tsx', import.meta.url), 'utf8');
assert.match(imageGridSource, /createCommunityImageState/);
assert.match(imageGridSource, /第一张图片会自动作为封面/);
assert.doesNotMatch(imageGridSource, /设为封面/);
assert.doesNotMatch(editorSource, /onCoverChange=/);
assert.match(editorSource, /setDraft\(\(current\) => \(\{ \.\.\.current, images, coverImageId \}\)\)/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd app && npx sucrase-node tests/community-navigation.test.ts
```

Expected: FAIL because the grid still has manual cover selection and the editor still passes `onCoverChange`.

- [ ] **Step 3: Write minimal implementation**

Update `CommunityImageGrid` props:

```ts
onChange: (state: { images: CommunityImage[]; coverImageId: string }) => void;
```

Replace upload, remove, and drop updates with:

```ts
onChange(createCommunityImageState(next));
onChange(removeCommunityImage(images, imageId));
onChange(createCommunityImageState(reorderCommunityImages(images, draggedId.current, image.id)));
```

Remove the manual cover button and render:

```tsx
{image.id === coverImageId && (
  <span className="absolute bottom-1 left-1 rounded-md px-2 py-1 font-kai text-[10px] text-white" style={{ backgroundColor: '#97352f' }}>
    封面
  </span>
)}
```

Update the helper text to:

```tsx
{error || '第一张图片会自动作为封面；拖动图片可排序。'}
```

Update `CommunityEditorPage` to:

```tsx
onChange={({ images, coverImageId }) => setDraft((current) => ({ ...current, images, coverImageId }))}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd app && npx sucrase-node tests/community-navigation.test.ts
```

Expected: PASS with `community navigation checks passed`.

## Task 3: Draft deletion in account page

**Files:**
- Modify: `app/src/pages/MyAccountPage.tsx`
- Modify: `app/tests/community-navigation.test.ts`

- [ ] **Step 1: Write failing source checks**

Add to `app/tests/community-navigation.test.ts` near account assertions:

```ts
assert.match(accountSource, /handleDeleteCommunityDraft/);
assert.match(accountSource, /communityService\?\.deletePost\(userId, post\.id\)/);
assert.match(accountSource, /setCommunityDrafts\(\(current\) => current\.filter\(\(draft\) => draft\.id !== post\.id\)\)/);
assert.match(accountSource, /确定删除这篇草稿吗/);
assert.match(accountSource, /aria-label=\{`删除草稿：\$\{post\.title \|\| '未命名草稿'\}`\}/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd app && npx sucrase-node tests/community-navigation.test.ts
```

Expected: FAIL because the handler and delete button do not exist.

- [ ] **Step 3: Write minimal implementation**

Add state in `MyAccountPage`:

```ts
const [communityDraftError, setCommunityDraftError] = useState('');
```

Add handler:

```ts
const handleDeleteCommunityDraft = async (post: CommunityPost) => {
  if (!window.confirm('确定删除这篇草稿吗？删除后不可恢复。')) return;
  setCommunityDraftError('');
  try {
    const deleted = await communityService?.deletePost(userId, post.id);
    if (!deleted) throw new Error('草稿删除失败，请稍后重试');
    setCommunityDrafts((current) => current.filter((draft) => draft.id !== post.id));
  } catch (caught) {
    setCommunityDraftError(caught instanceof Error ? caught.message : '草稿删除失败，请稍后重试');
  }
};
```

Render each draft row as a container with an edit button and a separate delete button:

```tsx
<div key={post.id} className="flex items-center gap-2 rounded-md px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.45)' }}>
  <button type="button" onClick={() => onEditCommunityDraft?.(post)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
    ...
  </button>
  <button type="button" aria-label={`删除草稿：${post.title || '未命名草稿'}`} onClick={() => void handleDeleteCommunityDraft(post)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-red-50" style={{ color: '#a13b32' }}>
    <Trash2 size={14} />
  </button>
</div>
```

Render error text below the draft list:

```tsx
{communityDraftError && (
  <p className="mt-2 font-kai text-[11px]" style={{ color: '#a13b32' }}>{communityDraftError}</p>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd app && npx sucrase-node tests/community-navigation.test.ts
```

Expected: PASS with `community navigation checks passed`.

## Task 4: Full verification and finish

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
cd app && npx sucrase-node tests/community-image.test.ts && npx sucrase-node tests/community-navigation.test.ts
```

Expected: both pass.

- [ ] **Step 2: Run full test suite**

Run:

```bash
cd app && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run production build**

Run:

```bash
cd app && npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 4: Review diff**

Run:

```bash
git diff -- app/src/lib/communityImage.ts app/src/components/community/CommunityImageGrid.tsx app/src/pages/CommunityEditorPage.tsx app/src/pages/MyAccountPage.tsx app/tests/community-image.test.ts app/tests/community-navigation.test.ts app/package.json
```

Expected: diff only contains the intended feature changes.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-06-23-community-draft-delete-and-first-image-cover.md app/src/lib/communityImage.ts app/src/components/community/CommunityImageGrid.tsx app/src/pages/CommunityEditorPage.tsx app/src/pages/MyAccountPage.tsx app/tests/community-image.test.ts app/tests/community-navigation.test.ts app/package.json
git commit -m "fix: improve community drafts and image cover handling"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: draft deletion is covered in Task 3; first-image automatic cover and first upload display regression are covered in Tasks 1 and 2; verification is covered in Task 4.
- Placeholder scan: no TBD/TODO/fill-in placeholders remain.
- Type consistency: `createCommunityImageState` returns `{ images, coverImageId }`; `CommunityImageGrid` emits that same object; `CommunityEditorPage` consumes the same object.
