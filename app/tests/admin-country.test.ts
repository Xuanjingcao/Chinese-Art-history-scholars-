import assert from 'node:assert/strict';
import { normalizeCountryForRegion } from '../src/lib/adminCountry.ts';

assert.equal(normalizeCountryForRegion('north-america', '德国'), '美国');
assert.equal(normalizeCountryForRegion('north-america', '加拿大'), '加拿大');
assert.equal(normalizeCountryForRegion('europe', '加拿大'), '英国');
assert.equal(normalizeCountryForRegion('europe', '', '慕尼黑大学 · LMU Munich'), '德国');
assert.equal(normalizeCountryForRegion('huabei', '美国'), '');

console.log('admin country normalization checks passed');
