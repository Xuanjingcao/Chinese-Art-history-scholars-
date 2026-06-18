import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const navSource = readFileSync(new URL('../src/components/MobileBottomNav.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const feedSource = readFileSync(new URL('../src/pages/CommunityFeedPage.tsx', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../src/pages/CommunityEditorPage.tsx', import.meta.url), 'utf8');

assert.match(navSource, /'community'/);
assert.match(navSource, /MessageCircleMore/);
assert.match(navSource, /label: '广场'/);
assert.match(navSource, /grid-cols-5/);
assert.match(appSource, /CommunityFeedPage/);
assert.match(appSource, /publicView === 'community'/);
assert.match(feedSource, /推荐/);
assert.match(feedSource, /最新/);
assert.match(feedSource, /发布感想/);
assert.match(editorSource, /maxLength=\{10_000\}/);
assert.match(editorSource, /存草稿/);
assert.match(editorSource, /草稿已保存/);
assert.match(editorSource, /确认封面/);
assert.match(appSource, /openCommunityEditorAfterLogin/);

console.log('community navigation checks passed');
