import assert from 'node:assert/strict';
import {
  clearCommunityFeedCache,
  readCommunityFeedCache,
  writeCommunityFeedCache,
} from '../src/lib/communityFeedCache.ts';

const post = {
  id: 'p1', userId: 'u1', nickname: '测试', title: '缓存测试', body: '正文',
  topic: '研究方法' as const, images: [], coverImageId: '', status: 'published' as const,
  likes: 1, comments: 0, bookmarks: 0, createdAt: '2026-06-22',
  updatedAt: '2026-06-22', publishedAt: '2026-06-22', likedByCurrentUser: true,
};

clearCommunityFeedCache();
assert.equal(readCommunityFeedCache('', 'u1'), undefined);
writeCommunityFeedCache('', 'u1', [post]);
assert.deepEqual(readCommunityFeedCache('', 'u1'), [post]);
assert.equal(readCommunityFeedCache('研究方法', 'u1'), undefined);
assert.equal(readCommunityFeedCache('', 'u2'), undefined);

const cached = readCommunityFeedCache('', 'u1')!;
cached[0].likes = 99;
assert.equal(readCommunityFeedCache('', 'u1')![0].likes, 1);

clearCommunityFeedCache();
assert.equal(readCommunityFeedCache('', 'u1'), undefined);
console.log('community feed cache checks passed');
