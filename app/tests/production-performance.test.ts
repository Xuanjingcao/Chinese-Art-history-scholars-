import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const headerSource = readFileSync(new URL('../src/sections/Header.tsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../src/lib/communityService.ts', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const notificationSource = readFileSync(new URL('../src/components/NotificationBell.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(headerSource, /getCloudBaseHealth/);
assert.match(headerSource, /getBrowserCloudBaseConfig\(\)\.enabled/);
assert.match(headerSource, /CloudBase 已启用/);
assert.match(serviceSource, /runCommunityFeedQueries/);
assert.match(appSource, /import HomeDiscoveryPage from '@\/pages\/HomeDiscoveryPage'/);
assert.doesNotMatch(appSource, /const HomeDiscoveryPage = lazy/);
assert.doesNotMatch(appSource, /正在打开首页/);
assert.match(headerSource, /activatedNotificationUserId/);
assert.match(headerSource, /initiallyOpen/);
assert.doesNotMatch(notificationSource, /setInterval/);
assert.match(notificationSource, /if \(!initiallyOpen\) return/);
assert.match(appSource, /const loadCommunityFeedPage = \(\) => import/);
assert.match(appSource, /lazy\(loadCommunityFeedPage\)/);
assert.match(appSource, /void loadCommunityFeedPage\(\)/);
console.log('production performance checks passed');
