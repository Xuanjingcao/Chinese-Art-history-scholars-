import assert from 'node:assert/strict';
import {
  canRemoveBookmarkRecord,
  getBookmarkOwnerId,
  isBookmarkOwnedByUser,
} from '../src/lib/bookmarkOwnership.ts';

assert.equal(
  getBookmarkOwnerId({ userId: 'user_123', _openid: 'openid_legacy' }),
  'user_123',
);

assert.equal(
  getBookmarkOwnerId({ _openid: 'openid_legacy' }),
  'openid_legacy',
);

assert.equal(
  isBookmarkOwnedByUser({ _openid: 'openid_legacy' }, 'openid_legacy'),
  true,
);

assert.equal(
  isBookmarkOwnedByUser({ userId: 'user_123' }, 'openid_legacy'),
  false,
);

assert.equal(
  canRemoveBookmarkRecord({ _openid: 'openid_legacy' }, 'openid_legacy'),
  true,
);

assert.equal(
  canRemoveBookmarkRecord({}, 'openid_legacy'),
  true,
);

assert.equal(
  canRemoveBookmarkRecord({ userId: 'someone_else' }, 'openid_legacy'),
  false,
);

console.log('bookmark ownership compatibility checks passed');
