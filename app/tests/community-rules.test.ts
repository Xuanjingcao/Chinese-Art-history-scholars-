import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildCommunityExcerpt,
  canPublishCommunityDraft,
  normalizeCommunityDraft,
  sortCommunityPosts,
} from '../src/lib/communityRules.ts';
import {
  removeCommunityImage,
  reorderCommunityImages,
  validateCommunityImageFile,
} from '../src/lib/communityImage.ts';

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

assert.equal(
  validateCommunityImageFile({ type: 'image/gif', size: 10 } as File),
  '仅支持 JPG、PNG 或 WebP 图片',
);
assert.equal(
  validateCommunityImageFile({ type: 'image/jpeg', size: 11 * 1024 * 1024 } as File),
  '单张图片不能超过 10MB',
);

const images = [
  { id: 'cover', source: 'cover.jpg', width: 1, height: 1 },
  { id: 'next', source: 'next.jpg', width: 1, height: 1 },
];
assert.equal(removeCommunityImage(images, 'cover', 'cover').coverImageId, 'next');
assert.deepEqual(reorderCommunityImages(images, 'next', 'cover').map((image) => image.id), ['next', 'cover']);

const imageGridSource = readFileSync(new URL('../src/components/community/CommunityImageGrid.tsx', import.meta.url), 'utf8');
assert.match(imageGridSource, /multiple/);
assert.match(imageGridSource, /最多上传 6 张图片/);
assert.match(imageGridSource, /设为封面/);

const cloudbaseSource = readFileSync(new URL('../src/lib/cloudbase.ts', import.meta.url), 'utf8');
assert.match(cloudbaseSource, /export async function uploadCommunityImage/);
assert.match(cloudbaseSource, /export async function resolveCommunityImageUrls/);

console.log('community rule checks passed');
