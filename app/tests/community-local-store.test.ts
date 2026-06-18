import assert from 'node:assert/strict';
import { createCommunityService } from '../src/lib/communityService.ts';

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
} as Storage;

const validDraft = {
  title: '田野调查准备清单', body: '完整正文', topic: '求学经验' as const,
  images: [], coverImageId: '',
};

const service = createCommunityService({
  storage, cloud: null,
  now: () => '2026-06-18T12:00:00.000Z',
  id: (() => { let index = 0; return () => `id-${++index}`; })(),
});

const draft = await service.saveDraft('u1', '林间读画', validDraft);
assert.equal(draft.status, 'draft');
assert.equal((await service.listMine('u1', 'draft')).length, 1);

const post = await service.publishPost('u1', '林间读画', draft.id);
assert.equal(post.status, 'published');
assert.equal((await service.listPublished()).length, 1);
assert.equal(await service.deletePost('u2', post.id), false);

const edited = await service.updatePost('u1', post.id, { ...validDraft, title: '修改后的标题' });
assert.equal(edited?.title, '修改后的标题');
assert.equal(await service.updatePost('u2', post.id, validDraft), null);

assert.deepEqual(await service.toggleReaction('u1', post.id, 'like'), { active: true });
assert.deepEqual(await service.toggleReaction('u1', post.id, 'like'), { active: false });
assert.deepEqual(await service.toggleReaction('u1', post.id, 'bookmark'), { active: true });

const comment = await service.addComment('u1', '林间读画', post.id, '很有帮助');
assert.equal((await service.listComments(post.id)).length, 1);
assert.equal(await service.deleteComment('u2', comment.id), false);
assert.equal(await service.deleteComment('u1', comment.id), true);

assert.equal(await service.deletePost('u1', post.id), true);
assert.equal((await service.listPublished()).length, 0);

console.log('community local store checks passed');
