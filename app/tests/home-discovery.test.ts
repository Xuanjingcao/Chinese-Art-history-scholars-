import assert from 'node:assert/strict';
import {
  getProfessorRecordedAt,
  getRecentProfessorEntries,
} from '../src/lib/homeDiscovery.ts';
import type { ProfessorRecord } from '../src/types/index.ts';

function createRecord(id: string, name: string, createdAt?: string): ProfessorRecord {
  return {
    id,
    name,
    nameEn: '',
    title: 'professor',
    university: '示例大学 · Example University',
    specialties: [],
    bio: '',
    achievements: [],
    publications: [],
    regionId: 'huabei',
    regionGlyph: '北',
    regionName: '华北地区',
    regionNameEn: 'North China',
    regionOrder: 0,
    createdAt,
  };
}

const explicitDateRecord = createRecord(
  'prof-1779000000000-explicit',
  '显式日期',
  '2026-05-30T10:00:00.000Z',
);
const timestampIdRecord = createRecord('prof-1779926400000-idtime', '编号日期');
const historicalRecord = createRecord('p001', '历史记录');
const expiredRecord = createRecord('prof-1777334400000-expired', '过期记录');

assert.equal(getProfessorRecordedAt(explicitDateRecord), '2026-05-30T10:00:00.000Z');
assert.equal(getProfessorRecordedAt(timestampIdRecord), '2026-05-28T00:00:00.000Z');
assert.equal(getProfessorRecordedAt(historicalRecord), null);

assert.deepEqual(
  getRecentProfessorEntries(
    [historicalRecord, timestampIdRecord, explicitDateRecord, expiredRecord],
    {
      now: new Date('2026-05-31T00:00:00.000Z'),
      withinDays: 14,
      limit: 3,
    },
  ).map((entry) => entry.professor.name),
  ['显式日期', '编号日期'],
);

console.log('home discovery recent collection checks passed');
