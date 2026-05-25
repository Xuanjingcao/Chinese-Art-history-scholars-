import assert from 'node:assert/strict';
import {
  isLocalNicknameReserved,
  reserveLocalNickname,
} from '../src/lib/authLocalNickname.ts';

const storage = new Map<string, string>();

globalThis.localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size;
  },
} as Storage;

storage.clear();
reserveLocalNickname(' Alex ');

assert.equal(isLocalNicknameReserved('Alex'), true);
assert.equal(isLocalNicknameReserved('  Alex  '), true);
assert.equal(isLocalNicknameReserved('Beth'), false);

console.log('auth local nickname reservation checks passed');
