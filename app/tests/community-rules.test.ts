import assert from 'node:assert/strict';
import {
  buildCommunityExcerpt,
  canPublishCommunityDraft,
  normalizeCommunityDraft,
  sortCommunityPosts,
} from '../src/lib/communityRules.ts';

const validDraft = {
  title: ' 重读《美术史十议》 ',
  body: ' 这是一段正文。 ',
  topic: '读书笔记' as const,
  images: [
    { id: 'a', source: 'a.jpg', width: 800, height: 600 },
    { id: 'b', source: 'b.jpg', width: 800, height: 600 },
  ],
  coverImageId: 'b',
};

assert.deepEqual(canPublishCommunityDraft(validDraft), []);
assert.equal(normalizeCommunityDraft(validDraft).title, '重读《美术史十议》');
assert.equal(buildCommunityExcerpt('第一段\n\n第二段', 5), '第一段…');
assert.deepEqual(
  canPublishCommunityDraft({ ...validDraft, coverImageId: '' }),
  ['请选择并确认一张封面图'],
);
assert.deepEqual(
  canPublishCommunityDraft({
    ...validDraft,
    images: Array.from({ length: 7 }, (_, index) => ({
      id: String(index), source: '', width: 1, height: 1,
    })),
  }),
  ['最多上传 6 张图片', '请选择并确认一张封面图'],
);

const sorted = sortCommunityPosts([
  { id: 'old-hot', likes: 20, comments: 4, publishedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'new', likes: 0, comments: 0, publishedAt: '2026-06-18T00:00:00.000Z' },
], 'latest');
assert.deepEqual(sorted.map((post) => post.id), ['new', 'old-hot']);

console.log('community rule checks passed');
