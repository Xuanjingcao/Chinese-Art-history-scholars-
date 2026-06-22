import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const headerSource = readFileSync(new URL('../src/sections/Header.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(headerSource, /getCloudBaseHealth/);
assert.match(headerSource, /getBrowserCloudBaseConfig\(\)\.enabled/);
assert.match(headerSource, /CloudBase 已启用/);
console.log('production performance checks passed');
