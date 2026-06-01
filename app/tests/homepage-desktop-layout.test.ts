import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync(new URL('../src/pages/HomeDiscoveryPage.tsx', import.meta.url), 'utf8');
const supplementSource = readFileSync(new URL('../src/sections/HomeSupplementEntry.tsx', import.meta.url), 'utf8');

assert.match(homeSource, /max-w-\[1180px\]/);
assert.match(homeSource, /lg:grid-cols-4/);
assert.match(homeSource, /basis-auto/);
assert.match(homeSource, /min-h-\[148px\]/);
assert.doesNotMatch(homeSource, /getDisplayTags/);
assert.doesNotMatch(homeSource, /MessageSquare/);
assert.doesNotMatch(homeSource, /snap-mandatory/);
assert.match(homeSource, /className="lg:hidden"/);
assert.match(supplementSource, /max-w-\[1180px\]/);

console.log('homepage desktop layout checks passed');
