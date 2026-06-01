import assert from 'node:assert/strict';
import { forceUnlockDocumentScroll, lockDocumentScroll } from '../src/lib/documentScrollLock.ts';

const documentLike = {
  documentElement: { style: { overflow: 'auto' } },
  body: { style: { overflow: 'scroll' } },
};

const unlock = lockDocumentScroll(documentLike);

assert.equal(documentLike.documentElement.style.overflow, 'hidden');
assert.equal(documentLike.body.style.overflow, 'hidden');

unlock();

assert.equal(documentLike.documentElement.style.overflow, 'auto');
assert.equal(documentLike.body.style.overflow, 'scroll');

const staleLockedDocumentLike = {
  documentElement: { style: { overflow: 'hidden' } },
  body: { style: { overflow: 'hidden' } },
};

forceUnlockDocumentScroll(staleLockedDocumentLike);

assert.equal(staleLockedDocumentLike.documentElement.style.overflow, '');
assert.equal(staleLockedDocumentLike.body.style.overflow, '');

console.log('document scroll lock checks passed');
