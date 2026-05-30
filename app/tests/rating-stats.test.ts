import assert from 'node:assert/strict';
import {
  calculateNextRating,
  getStarDisplayScore,
  summarizeRatingRecords,
} from '../src/lib/ratingStats.ts';

assert.deepEqual(
  calculateNextRating({ average: 0, count: 0 }, 0, 5),
  { average: 5, count: 1, userRating: 5 },
);

assert.deepEqual(
  calculateNextRating({ average: 5, count: 1 }, 5, 5),
  { average: 0, count: 0, userRating: 0 },
);

assert.deepEqual(
  calculateNextRating({ average: 4.5, count: 2 }, 5, 4.5),
  { average: 4.3, count: 2, userRating: 4.5 },
);

assert.deepEqual(
  summarizeRatingRecords([
    { userId: 'user_001', score: 5 },
    { userId: 'user_002', score: 3.5 },
  ], 'user_003'),
  { average: 4.3, count: 2, userRating: 0 },
);

assert.deepEqual(
  summarizeRatingRecords([
    { userId: 'user_001', score: 5 },
    { userId: 'user_002', score: 3.5 },
  ], 'user_002'),
  { average: 4.3, count: 2, userRating: 3.5 },
);

assert.equal(getStarDisplayScore({ average: 4.3, count: 2, userRating: 0 }), 0);
assert.equal(getStarDisplayScore({ average: 4.3, count: 2, userRating: 3.5 }), 3.5);

console.log('rating stats transition checks passed');
