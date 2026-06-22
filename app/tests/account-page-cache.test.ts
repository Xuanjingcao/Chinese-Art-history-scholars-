import assert from 'node:assert/strict';
import {
  clearAccountPageCache,
  readAccountPageCache,
  writeAccountPageCache,
} from '../src/lib/accountPageCache.ts';

const storedValues = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    get length() { return storedValues.size; },
    key: (index: number) => [...storedValues.keys()][index] ?? null,
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => storedValues.set(key, value),
    removeItem: (key: string) => storedValues.delete(key),
  },
});

const snapshot = {
  user: {
    userId: 'u1',
    username: 'reader',
    nickname: '读者',
    email: 'reader@example.com',
    avatar: '',
    createdAt: '2026-06-22T00:00:00.000Z',
  },
  bookmarks: [],
  history: [],
  submissions: [],
  notes: [],
  communityPosts: [],
  communityDrafts: [],
};

clearAccountPageCache();
writeAccountPageCache('u1', snapshot);
assert.deepEqual(readAccountPageCache('u1'), snapshot);
assert.equal(readAccountPageCache('u2'), undefined);

const cached = readAccountPageCache('u1')!;
cached.user!.nickname = '被修改';
assert.equal(readAccountPageCache('u1')!.user!.nickname, '读者');

storedValues.set('account-page-cache:v1:u1', '{broken');
assert.equal(readAccountPageCache('u1'), undefined);
assert.equal(storedValues.has('account-page-cache:v1:u1'), false);

writeAccountPageCache('u1', snapshot);
writeAccountPageCache('u2', { ...snapshot, user: { ...snapshot.user, userId: 'u2' } });
clearAccountPageCache('u1');
assert.equal(readAccountPageCache('u1'), undefined);
assert.equal(readAccountPageCache('u2')!.user!.userId, 'u2');
clearAccountPageCache();
assert.equal(storedValues.size, 0);

console.log('account page cache checks passed');
