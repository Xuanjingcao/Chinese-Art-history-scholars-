import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCommunityDraftSaveQueue, createCommunityService } from '../src/lib/communityService.ts';

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

let releaseFirstSave: (() => void) | undefined;
const saveInputs: Array<{ id?: string; body: string }> = [];
const queuedSave = createCommunityDraftSaveQueue(async (input) => {
  saveInputs.push({ id: input.id, body: input.body });
  if (saveInputs.length === 1) {
    await new Promise<void>((resolve) => { releaseFirstSave = resolve; });
  }
  return {
    ...input,
    id: input.id || 'cloud-draft-1',
    userId: 'u1', nickname: '林间读画', status: 'draft' as const,
    likes: 0, comments: 0, bookmarks: 0,
    createdAt: '2026-06-18T12:00:00.000Z', updatedAt: '2026-06-18T12:00:00.000Z', publishedAt: '',
  };
});
const firstQueuedSave = queuedSave({ ...validDraft, body: '自动保存的旧内容' });
const publishQueuedSave = queuedSave({ ...validDraft, body: '点击发布时的最新内容' });
await Promise.resolve();
assert.equal(saveInputs.length, 1, '第二次写入必须等待第一次完成');
releaseFirstSave?.();
await firstQueuedSave;
await publishQueuedSave;
assert.equal(saveInputs[1].id, 'cloud-draft-1', '发布前的最新保存应复用自动保存创建的文档');
assert.equal(saveInputs[1].body, '点击发布时的最新内容');

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

const savedPublishedEdit = await service.saveDraft('u1', '林间读画', { ...validDraft, id: post.id, title: '保存中的公开编辑' });
assert.equal(savedPublishedEdit.status, 'published');

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

const serviceSource = readFileSync(new URL('../src/lib/communityService.ts', import.meta.url), 'utf8');
assert.match(serviceSource, /collection\('community_posts'\)/);
assert.match(serviceSource, /collection\('community_comments'\)/);
assert.match(serviceSource, /collection\('community_reactions'\)/);
assert.match(serviceSource, /isCloudBaseAvailable/);

console.log('community local store checks passed');
