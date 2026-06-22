# Remove Repeated Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove avoidable loading messages on the production home/community path and prevent logged-in home visits from eagerly loading CloudBase notifications.

**Architecture:** Render the home discovery view from the main application bundle, activate the notification module only after a bell click, and persist community feed snapshots in versioned `sessionStorage` with an in-memory fallback. Keep low-frequency heavy routes lazy and keep community refreshes running in the background.

**Tech Stack:** React 19, TypeScript, Vite, Node assert tests via `sucrase-node`, CloudBase JS SDK

---

### Task 1: Render the home screen without a route fallback

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/tests/production-performance.test.ts`

- [ ] **Step 1: Write the failing source-contract test**

Add assertions that `HomeDiscoveryPage` uses a static import, is not declared with `lazy`, and the home branch no longer contains `正在打开首页`.

```ts
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.match(appSource, /import HomeDiscoveryPage from '@\/pages\/HomeDiscoveryPage'/);
assert.doesNotMatch(appSource, /const HomeDiscoveryPage = lazy/);
assert.doesNotMatch(appSource, /正在打开首页/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx sucrase-node tests/production-performance.test.ts`

Expected: FAIL because `HomeDiscoveryPage` is still lazy and the home fallback text exists.

- [ ] **Step 3: Implement the minimal home import change**

Replace the lazy declaration with a static import and render the home fragment directly without its `Suspense` wrapper.

```ts
import HomeDiscoveryPage from '@/pages/HomeDiscoveryPage';
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx sucrase-node tests/production-performance.test.ts`

Expected: `production performance checks passed`.

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx app/tests/production-performance.test.ts
git commit -m "perf: render homepage without lazy fallback"
```

### Task 2: Load notifications only after the bell is clicked

**Files:**
- Modify: `app/src/sections/Header.tsx`
- Modify: `app/src/components/NotificationBell.tsx`
- Modify: `app/tests/production-performance.test.ts`

- [ ] **Step 1: Write failing notification activation assertions**

Assert that Header tracks the activated user, passes `initiallyOpen`, and NotificationBell no longer installs an interval or calls `loadNotifications` from an unconditional mount effect.

```ts
const notificationSource = readFileSync(new URL('../src/components/NotificationBell.tsx', import.meta.url), 'utf8');
assert.match(headerSource, /activatedNotificationUserId/);
assert.match(headerSource, /initiallyOpen/);
assert.doesNotMatch(notificationSource, /setInterval/);
assert.match(notificationSource, /if \(!initiallyOpen\) return/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx sucrase-node tests/production-performance.test.ts`

Expected: FAIL because Header currently mounts NotificationBell immediately and NotificationBell polls on mount.

- [ ] **Step 3: Implement click activation**

In Header, render the lightweight `BellButton` until its logged-in user clicks it. Store the activated user ID so logout/login changes cannot trigger a query for a different user. Then lazy-render NotificationBell with `initiallyOpen`.

In NotificationBell, add `initiallyOpen?: boolean`, initialize the panel from it, load once only when that prop is true, and remove the mount-time request plus 30-second interval. Keep later panel opens refreshing through `handleOpenPanel`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx sucrase-node tests/production-performance.test.ts`

Expected: `production performance checks passed`.

- [ ] **Step 5: Commit**

```bash
git add app/src/sections/Header.tsx app/src/components/NotificationBell.tsx app/tests/production-performance.test.ts
git commit -m "perf: defer notifications until user interaction"
```

### Task 3: Persist community snapshots for the browser session

**Files:**
- Modify: `app/src/lib/communityFeedCache.ts`
- Modify: `app/tests/community-feed-cache.test.ts`

- [ ] **Step 1: Write the failing session-storage test**

Install a minimal fake `sessionStorage`, write a feed, assert a versioned key exists, replace that stored JSON with a different like count, and assert the next read returns the stored value. Also assert clear removes versioned entries.

```ts
const values = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
  get length() { return values.size; },
  key: (index: number) => [...values.keys()][index] ?? null,
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
} });
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx sucrase-node tests/community-feed-cache.test.ts`

Expected: FAIL because the current cache only writes to a module-level Map.

- [ ] **Step 3: Implement versioned session persistence**

Use `community-feed-cache:v1:` plus the existing user/topic key. Read and write `sessionStorage` when available; if storage access throws or is absent, fall back to the existing Map. Parse only arrays, clone on every boundary, and remove corrupt entries.

- [ ] **Step 4: Run focused cache and navigation tests**

Run: `npx sucrase-node tests/community-feed-cache.test.ts && npx sucrase-node tests/community-navigation.test.ts`

Expected: both scripts pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/communityFeedCache.ts app/tests/community-feed-cache.test.ts
git commit -m "perf: persist community feed cache per session"
```

### Task 4: Full verification and browser QA

**Files:**
- Verify only; no production files expected.

- [ ] **Step 1: Run all automated checks**

Run: `npm test && npm run build && git diff --check && git status --short`

Expected: all tests pass, Vite build succeeds, no whitespace errors, clean worktree.

- [ ] **Step 2: Run local browser QA**

Start the isolated app on an available `127.0.0.1` port. Verify the first home DOM contains real home content and not `正在打开首页`; verify no CloudBase SDK request or relevant console warning occurs merely from a logged-out home visit; enter the community, return home, reload, and confirm the cached feed result is immediately rendered on re-entry.

- [ ] **Step 3: Record deployment limitation**

Report that CloudBase still returns `Cache-Control: no-store` until `/assets/*` caching is configured in the hosting console, so the main JS/CSS/image downloads remain a separate deployment concern.

