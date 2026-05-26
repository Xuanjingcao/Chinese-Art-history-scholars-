import assert from 'node:assert/strict';
import {
  getCanonicalUniversityKey,
  getUniversityDisplayName,
  getUniversityNameParts,
} from '../src/lib/universityNames.ts';

assert.deepEqual(
  getUniversityNameParts('Wake Forest University'),
  { nameZh: '', nameEn: 'Wake Forest University' },
);

assert.deepEqual(
  getUniversityNameParts('维克森林大学 Wake Forest University'),
  { nameZh: '维克森林大学', nameEn: 'Wake Forest University' },
);

assert.equal(getUniversityDisplayName('Wake Forest University'), 'Wake Forest University');
assert.equal(getCanonicalUniversityKey('Wake Forest University'), 'wake forest university');

console.log('university name parsing checks passed');
