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

const { deleteComment, getComments } = await import('../src/lib/comments.ts');

storage.set(
  'local_comments',
  JSON.stringify([
    {
      _id: 'legacy-parent',
      professorId: 'prof-a',
      name: '曹进',
      content: '学者，或者说大学者。其他就谈不上。',
      isAnonymous: false,
      parentId: '',
      createdAt: '2026-05-10T00:00:00.000Z',
    },
    {
      _id: 'legacy-reply',
      professorId: 'prof-a',
      name: '鱼',
      content: '回复 鱼',
      isAnonymous: false,
      parentId: 'legacy-parent',
      createdAt: '2026-05-10T00:01:00.000Z',
    },
    {
      id: 'other-comment',
      professorId: 'prof-a',
      name: '玄敬',
      content: '大师',
      isAnonymous: false,
      parentId: '',
      createdAt: '2026-05-25T00:00:00.000Z',
    },
  ]),
);

storage.set(
  'local_comment_votes',
  JSON.stringify({
    'user-a:legacy-parent': 'like',
    'user-a:legacy-reply': 'dislike',
    'user-a:other-comment': 'like',
  }),
);

assert.equal(await deleteComment('legacy-parent'), true);

const comments = await getComments('prof-a', 'user-a');
assert.deepEqual(comments.map(comment => comment.id), ['other-comment']);

const storedComments = JSON.parse(storage.get('local_comments') ?? '[]');
assert.deepEqual(storedComments.map((comment: { id?: string; _id?: string }) => comment.id ?? comment._id), [
  'other-comment',
]);

assert.deepEqual(JSON.parse(storage.get('local_comment_votes') ?? '{}'), {
  'user-a:other-comment': 'like',
});

console.log('local comment deletion compatibility checks passed');
