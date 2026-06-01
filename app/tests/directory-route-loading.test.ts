import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert.match(appSource, /import CategoryDirectoryPage from '@\/pages\/CategoryDirectoryPage';/);
assert.match(appSource, /import AcademyDirectoryPage from '@\/pages\/AcademyDirectoryPage';/);
assert.doesNotMatch(appSource, /lazy\([^)]*CategoryDirectoryPage/);
assert.doesNotMatch(appSource, /lazy\([^)]*AcademyDirectoryPage/);

console.log('directory routes stay eagerly loaded');
