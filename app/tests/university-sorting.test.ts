import assert from 'node:assert/strict';
import { sortByUniversityName } from '../src/lib/universitySorting.ts';

const overseasSchools = [
  { name: '堪萨斯大学 · The University of Kansas' },
  { name: '纽约大学 · New York University' },
  { name: '哈佛大学 · Harvard University' },
  { name: '芝加哥大学 · University of Chicago' },
];

assert.deepEqual(
  sortByUniversityName(overseasSchools, { preferEnglish: true }).map((school) => school.name),
  [
    '哈佛大学 · Harvard University',
    '纽约大学 · New York University',
    '堪萨斯大学 · The University of Kansas',
    '芝加哥大学 · University of Chicago',
  ],
);

console.log('university sorting checks passed');
