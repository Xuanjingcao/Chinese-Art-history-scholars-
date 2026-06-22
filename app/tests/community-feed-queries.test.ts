import assert from 'node:assert/strict';
import { runCommunityFeedQueries } from '../src/lib/communityFeedQueries.ts';

const started: string[] = [];
let resolvePosts!: (value: string[]) => void;
let resolveReactions!: (value: number[]) => void;

const resultPromise = runCommunityFeedQueries(
  () => new Promise<string[]>((resolve) => { started.push('posts'); resolvePosts = resolve; }),
  () => new Promise<number[]>((resolve) => { started.push('reactions'); resolveReactions = resolve; }),
);

assert.deepEqual(started, ['posts', 'reactions']);
resolvePosts(['p1']);
resolveReactions([1]);
assert.deepEqual(await resultPromise, { posts: ['p1'], reactions: [1] });

assert.deepEqual(
  await runCommunityFeedQueries(async () => ['guest-post']),
  { posts: ['guest-post'], reactions: [] },
);
console.log('community feed query checks passed');
