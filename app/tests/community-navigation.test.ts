import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const navSource = readFileSync(new URL('../src/components/MobileBottomNav.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const feedSource = readFileSync(new URL('../src/pages/CommunityFeedPage.tsx', import.meta.url), 'utf8');

assert.match(navSource, /'community'/);
assert.match(navSource, /MessageCircleMore/);
assert.match(navSource, /label: '广场'/);
assert.match(navSource, /grid-cols-5/);
assert.match(appSource, /CommunityFeedPage/);
assert.match(appSource, /publicView === 'community'/);
assert.match(feedSource, /推荐/);
assert.match(feedSource, /最新/);
assert.match(feedSource, /发布感想/);

console.log('community navigation checks passed');
