import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const accountSource = readFileSync(new URL('../src/pages/MyAccountPage.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(accountSource, /if \(loading\)/);
assert.doesNotMatch(accountSource, /加载中\.\.\./);
assert.match(accountSource, /readAccountPageCache/);
assert.match(accountSource, /writeAccountPageCache/);
assert.match(accountSource, /Promise\.allSettled/);
assert.match(accountSource, /getBookmarks\(userId\)/);
assert.match(accountSource, /getBrowsingHistory\(userId\)/);
assert.match(accountSource, /getSubmissions\(userId\)/);
assert.match(accountSource, /getNotes\(userId\)/);
assert.match(accountSource, /listMine\(userId, 'published'\)/);
assert.match(accountSource, /listMine\(userId, 'draft'\)/);

assert.match(appSource, /import MyAccountPage from '@\/pages\/MyAccountPage'/);
assert.doesNotMatch(appSource, /const MyAccountPage = lazy/);
assert.doesNotMatch(appSource, /正在打开账户/);

console.log('account page performance checks passed');
