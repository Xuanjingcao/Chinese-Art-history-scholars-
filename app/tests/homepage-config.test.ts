import assert from 'node:assert/strict';
import {
  HOMEPAGE_SECTION_LIMITS,
  normalizeHomepageConfig,
} from '../src/lib/homepageConfig.ts';
import {
  getMissingHomepageProfessorRefs,
  getHomepageRecommendedProfessors,
  getHomepageUniversities,
} from '../src/lib/homeDiscovery.ts';
import type { ProfessorRecord, Region } from '../src/types/index.ts';

function createRecord(id: string, name: string, university: string): ProfessorRecord {
  return {
    id,
    name,
    nameEn: '',
    title: 'professor',
    university,
    specialties: [],
    bio: '',
    achievements: [],
    publications: [],
    regionId: 'huabei',
    regionGlyph: '北',
    regionName: '华北地区',
    regionNameEn: 'North China',
    regionOrder: 0,
  };
}

const professors = [
  createRecord('p001', '包华石', '北京大学 · Peking University'),
  createRecord('p002', '巫鸿', '芝加哥大学 · University of Chicago'),
  createRecord('p003', '郑岩', '北京大学 · Peking University'),
];

assert.deepEqual(HOMEPAGE_SECTION_LIMITS, {
  recommendedProfessors: 8,
  academyUniversities: 3,
  recentEntries: 3,
});

const regions: Region[] = [
  {
    id: 'huabei',
    glyph: '北',
    name: '华北地区',
    nameEn: 'North China',
    count: 2,
    universities: [
      { name: '北京大学 · Peking University', professors: [professors[0], professors[2]] },
    ],
  },
  {
    id: 'north-america',
    glyph: '美',
    name: '北美地区',
    nameEn: 'North America',
    count: 1,
    universities: [
      { name: '芝加哥大学 · University of Chicago', country: '美国', professors: [professors[1]] },
    ],
  },
];

const normalized = normalizeHomepageConfig({
  recommendedProfessorRefs: [' p002 ', 'p002', '', '包华石'],
  academyUniversityRefs: [' 芝加哥大学 ', '芝加哥大学', '北京大学'],
  recentEntries: [
    {
      id: ' recent-1 ',
      kind: 'professor',
      title: ' 新增学者 · 示例 ',
      detail: ' 示例大学 ',
      recordedAt: '2026-05-30T00:00:00.000Z',
      professorRef: ' p001 ',
    },
    { id: 'invalid', kind: 'website', title: '', detail: '', recordedAt: 'not-a-date' },
  ],
});

assert.deepEqual(normalized.recommendedProfessorRefs, ['p002', '包华石']);
assert.deepEqual(normalized.academyUniversityRefs, ['芝加哥大学', '北京大学']);
assert.deepEqual(normalized.recentEntries, [
  {
    id: 'recent-1',
    kind: 'professor',
    title: '新增学者 · 示例',
    detail: '示例大学',
    recordedAt: '2026-05-30T00:00:00.000Z',
    professorRef: 'p001',
  },
]);

assert.deepEqual(
  getHomepageRecommendedProfessors(professors, ['p002', '包华石'], 3).map((professor) => professor.id),
  ['p002', 'p001'],
);

assert.deepEqual(
  getMissingHomepageProfessorRefs(professors, ['包华石', '曹意强', 'missing-id']),
  ['曹意强', 'missing-id'],
);

assert.deepEqual(
  getHomepageUniversities(regions, ['芝加哥大学', '北京大学'], 2).map((university) => university.nameZh),
  ['芝加哥大学', '北京大学'],
);

console.log('homepage config checks passed');
