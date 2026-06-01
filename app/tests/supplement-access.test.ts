import assert from 'node:assert/strict';
import {
  getSupplementEntryAction,
} from '../src/lib/supplementAccess.ts';

assert.equal(getSupplementEntryAction(true), 'open-supplement');
assert.equal(getSupplementEntryAction(false), 'request-login');

console.log('supplement access checks passed');
