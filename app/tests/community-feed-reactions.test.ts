import assert from 'node:assert/strict';
import { setCommunityPostLike } from '../src/lib/communityFeedReactions.ts';

const posts = [
  { id: 'p1', likes: 2, likedByCurrentUser: false },
  { id: 'p2', likes: 7 },
];

const liked = setCommunityPostLike(posts, 'p1', true);
assert.deepEqual(liked[0], { id: 'p1', likes: 3, likedByCurrentUser: true });
assert.equal(liked[1], posts[1]);
assert.equal(setCommunityPostLike(liked, 'p1', true)[0].likes, 3);
assert.equal(
  setCommunityPostLike([{ id: 'p1', likes: 0, likedByCurrentUser: true }], 'p1', false)[0].likes,
  0,
);

console.log('community feed reaction checks passed');
