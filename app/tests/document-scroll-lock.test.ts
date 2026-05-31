import assert from 'node:assert/strict';
import { lockDocumentScroll } from '../src/lib/documentScrollLock.ts';

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

console.log('document scroll lock checks passed');
