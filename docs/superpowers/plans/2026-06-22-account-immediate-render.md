# 账户页立即显示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击“我的账户”后立即渲染页面，并用按用户隔离的会话缓存和并行后台请求更新账户数据。

**Architecture:** 新建纯函数式账户快照缓存模块，负责版本化 `sessionStorage` 读写和损坏回退。账户组件从快照初始化各区域，始终渲染页面，并以 `Promise.allSettled` 同时请求七类数据；应用入口静态导入账户页，移除路由级等待。

**Tech Stack:** React 19、TypeScript、Vite、CloudBase JS SDK、Node `assert` 测试

---

### Task 1: 账户快照缓存

**Files:**
- Create: `app/src/lib/accountPageCache.ts`
- Create: `app/tests/account-page-cache.test.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Write the failing cache test**

创建内存版 `sessionStorage`，验证 `writeAccountPageCache('u1', snapshot)` 后可读取、`u2` 读不到、返回对象不会反向修改缓存，并验证非法 JSON 会被删除并返回 `undefined`。

```ts
writeAccountPageCache('u1', snapshot);
assert.deepEqual(readAccountPageCache('u1'), snapshot);
assert.equal(readAccountPageCache('u2'), undefined);
storedValues.set('account-page-cache:v1:u1', '{broken');
assert.equal(readAccountPageCache('u1'), undefined);
```

把 `sucrase-node tests/account-page-cache.test.ts` 加到 `package.json` 的 `test` 脚本开头。

- [ ] **Step 2: Run the test and verify RED**

Run: `cd app && npx sucrase-node tests/account-page-cache.test.ts`

Expected: FAIL because `../src/lib/accountPageCache.ts` does not exist.

- [ ] **Step 3: Implement the cache module**

定义并导出：

```ts
export interface AccountPageSnapshot {
  user: MockUser | null;
  bookmarks: Bookmark[];
  history: BrowsingRecord[];
  submissions: Submission[];
  notes: Note[];
  communityPosts: CommunityPost[];
  communityDrafts: CommunityPost[];
}

export function readAccountPageCache(userId: string): AccountPageSnapshot | undefined;
export function writeAccountPageCache(userId: string, snapshot: AccountPageSnapshot): void;
export function clearAccountPageCache(userId?: string): void;
```

存储键使用 `account-page-cache:v1:${userId}`。读写均通过 JSON 序列化形成独立副本；解析失败时删除损坏条目；存储不可访问时安静回退。

- [ ] **Step 4: Run the cache test and verify GREEN**

Run: `cd app && npx sucrase-node tests/account-page-cache.test.ts`

Expected: `account page cache checks passed`.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/accountPageCache.ts app/tests/account-page-cache.test.ts app/package.json
git commit -m "perf: cache account page data per session"
```

### Task 2: 账户页面非阻塞刷新

**Files:**
- Create: `app/tests/account-page-performance.test.ts`
- Modify: `app/src/pages/MyAccountPage.tsx`
- Modify: `app/package.json`

- [ ] **Step 1: Write the failing behavior test**

读取 `MyAccountPage.tsx` 源码并断言：不包含整页 `if (loading)` 和 `加载中...`，包含账户缓存读写，包含 `Promise.allSettled`，七个请求都直接使用已知 `userId` 启动。

```ts
assert.doesNotMatch(accountSource, /if \(loading\)/);
assert.doesNotMatch(accountSource, /加载中\.\.\./);
assert.match(accountSource, /readAccountPageCache/);
assert.match(accountSource, /writeAccountPageCache/);
assert.match(accountSource, /Promise\.allSettled/);
```

把该测试加入 `package.json` 的 `test` 脚本。

- [ ] **Step 2: Run the test and verify RED**

Run: `cd app && npx sucrase-node tests/account-page-performance.test.ts`

Expected: FAIL because the component still contains the full-page loading branch and has no account cache.

- [ ] **Step 3: Initialize state from the session snapshot**

在组件首次创建时读取一次缓存，并用它初始化 `user`、`bookmarks`、`history`、`submissions`、`notes`、`communityPosts`、`communityDrafts`。删除 `loading` 状态和整页加载返回分支。

```ts
const [initialSnapshot] = useState(() => readAccountPageCache(userId));
const [user, setUser] = useState<MockUser | null>(() => initialSnapshot?.user ?? null);
const [bookmarks, setBookmarks] = useState(() => initialSnapshot?.bookmarks ?? []);
```

- [ ] **Step 4: Start all requests together and keep partial successes**

用 `Promise.allSettled` 同时启动 `getCurrentUser()`、四组账户服务数据和两组社区数据。逐项只应用 `fulfilled` 结果，失败项记录警告并保留缓存/当前状态。所有数据查询直接使用已经登录的 `userId`，不再等待用户资料查询完成后才开始。

```ts
const results = await Promise.allSettled([
  getCurrentUser(),
  getBookmarks(userId),
  getBrowsingHistory(userId),
  getSubmissions(userId),
  getNotes(userId),
  communityService?.listMine(userId, 'published') ?? Promise.resolve([]),
  communityService?.listMine(userId, 'draft') ?? Promise.resolve([]),
]);
```

- [ ] **Step 5: Persist refreshed and locally mutated state**

增加 `useEffect`，任一账户数据状态变化时写入完整快照。删除收藏、清空历史和修改昵称继续通过现有状态更新，因此同一个 effect 会同步刷新缓存。

- [ ] **Step 6: Run the behavior and cache tests**

Run: `cd app && npx sucrase-node tests/account-page-performance.test.ts && npx sucrase-node tests/account-page-cache.test.ts`

Expected: both tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/src/pages/MyAccountPage.tsx app/tests/account-page-performance.test.ts app/package.json
git commit -m "perf: render account while data refreshes"
```

### Task 3: 移除账户入口的懒加载提示

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/tests/account-page-performance.test.ts`

- [ ] **Step 1: Extend the test for the account route**

加入以下断言，并先运行确认失败：

```ts
assert.match(appSource, /import MyAccountPage from '@\/pages\/MyAccountPage'/);
assert.doesNotMatch(appSource, /const MyAccountPage = lazy/);
assert.doesNotMatch(appSource, /正在打开账户/);
```

Run: `cd app && npx sucrase-node tests/account-page-performance.test.ts`

Expected: FAIL because `MyAccountPage` is still lazy-loaded.

- [ ] **Step 2: Statically import and render the account page**

把账户页改为普通 import，并移除账户分支外围的 `Suspense`；其他低频页面继续懒加载。

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `cd app && npx sucrase-node tests/account-page-performance.test.ts`

Expected: `account page performance checks passed`.

- [ ] **Step 4: Commit**

```bash
git add app/src/App.tsx app/tests/account-page-performance.test.ts
git commit -m "perf: open account without route fallback"
```

### Task 4: 完整验证

**Files:**
- Verify only

- [ ] **Step 1: Run all automated tests**

Run: `cd app && npm test`

Expected: exit code 0 and every test script prints its pass message.

- [ ] **Step 2: Run the production build**

Run: `cd app && npm run build`

Expected: TypeScript and Vite build exit code 0.

- [ ] **Step 3: Browser QA**

启动本地 Vite，使用应用内 Browser 验证：主页加载、已登录状态点击“我的账户”、页面立刻出现“我的账户”且无整页“加载中...”、控制台无相关错误。再次返回并进入账户页，确认缓存内容立即出现。若本地没有可用登录态，至少验证页面构建、入口代码与自动测试，并明确记录登录流程未手测。

- [ ] **Step 4: Review the final diff**

Run: `git diff main...HEAD --check && git status --short`

Expected: no whitespace errors; only planned files changed.
