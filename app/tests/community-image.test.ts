import assert from 'node:assert/strict';
import {
  createCommunityImageState,
  removeCommunityImage,
  reorderCommunityImages,
} from '../src/lib/communityImage.ts';
import type { CommunityImage } from '../src/types/community.ts';

const image = (id: string): CommunityImage => ({
  id,
  source: `data:image/jpeg;base64,${id}`,
  width: 100,
  height: 100,
});

const first = image('first');
const second = image('second');
const third = image('third');

assert.deepEqual(createCommunityImageState([first, second]), {
  images: [first, second],
  coverImageId: 'first',
});

assert.deepEqual(createCommunityImageState([]), {
  images: [],
  coverImageId: '',
});

const reordered = reorderCommunityImages([first, second, third], 'third', 'first');
assert.deepEqual(createCommunityImageState(reordered), {
  images: [third, first, second],
  coverImageId: 'third',
});

assert.deepEqual(removeCommunityImage([first, second], 'first'), {
  images: [second],
  coverImageId: 'second',
});

console.log('community image cover checks passed');
