import assert from 'node:assert/strict';
import {
  formatSubmissionTimestamp,
  pickSubmissionCreatedAt,
} from '../src/lib/submissionTimestamps.ts';

assert.equal(
  pickSubmissionCreatedAt({ createdAt: '2026-06-01T03:12:07.785Z' }),
  '2026-06-01T03:12:07.785Z',
);

assert.equal(
  pickSubmissionCreatedAt({ _createTime: 1780283527785 }),
  new Date(1780283527785).toISOString(),
);

assert.equal(
  pickSubmissionCreatedAt({}),
  '',
);

assert.notEqual(
  formatSubmissionTimestamp('2026-06-01T03:12:07.785Z', 'date'),
  'Invalid Date',
);

assert.equal(
  formatSubmissionTimestamp('', 'date'),
  '未记录时间',
);

console.log('submission timestamp compatibility checks passed');
