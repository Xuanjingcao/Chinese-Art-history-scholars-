import assert from 'node:assert/strict';

const storage = new Map<string, string>();

(globalThis as typeof globalThis & {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
  window: { location: { hostname: string } };
}).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};

(globalThis as typeof globalThis & { window: { location: { hostname: string } } }).window = {
  location: { hostname: '127.0.0.1' },
};

const {
  createSubmission,
  getAdminSubmissions,
  getSubmissions,
  reviewSubmission,
} = await import('../src/lib/accountService.ts');

const created = await createSubmission('user_local', {
  type: 'website',
  subject: '东京艺术大学官网',
  university: '',
  website: 'https://www.geidai.ac.jp/',
  researchAreas: '',
  details: '补充学院官网入口',
});

assert.ok(created, 'expected local submission to be created');

const beforeReview = await getAdminSubmissions();
const createdBefore = beforeReview.find((item) => item.id === created?.id);
assert.ok(createdBefore, 'admin list should include newly created local submission');
assert.equal(createdBefore?.status, 'pending');

const reviewed = await reviewSubmission(created!.id, 'approved', '已经补录到站点里。');
assert.ok(reviewed, 'review result should be returned');
assert.equal(reviewed?.status, 'approved');
assert.equal(reviewed?.adminReply, '已经补录到站点里。');

const userSubmissions = await getSubmissions('user_local');
const createdAfter = userSubmissions.find((item) => item.id === created?.id);
assert.equal(createdAfter?.status, 'approved');
assert.equal(createdAfter?.adminReply, '已经补录到站点里。');

const reviewedMock = await reviewSubmission('sb_002', 'rejected', '这条更正需要更具体的出处。');
assert.equal(reviewedMock?.status, 'rejected');

const demoUserSubmissions = await getSubmissions('u_001');
const updatedMock = demoUserSubmissions.find((item) => item.id === 'sb_002');
assert.equal(updatedMock?.status, 'rejected');
assert.equal(updatedMock?.adminReply, '这条更正需要更具体的出处。');

console.log('admin submission review checks passed');
