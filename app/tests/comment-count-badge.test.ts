import assert from 'node:assert/strict';
import { formatCommentCountBadge } from '../src/lib/commentCountBadge.ts';

assert.equal(formatCommentCountBadge(0), null);
assert.equal(formatCommentCountBadge(-1), null);
assert.equal(formatCommentCountBadge(1), '1');
assert.equal(formatCommentCountBadge(99), '99');
assert.equal(formatCommentCountBadge(100), '99+');
assert.equal(formatCommentCountBadge(238), '99+');

console.log('comment count badge formatting checks passed');
