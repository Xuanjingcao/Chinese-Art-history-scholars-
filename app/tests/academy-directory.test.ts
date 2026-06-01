import assert from 'node:assert/strict';
import {
  buildAcademyDirectory,
  getAcademySubregionOptions,
  matchesAcademySubregion,
} from '../src/lib/academyDirectory.ts';
import { normalizeAcademyConfig } from '../src/lib/academyConfig.ts';
import type { Region } from '../src/types/index.ts';

const regions: Region[] = [
  {
    id: 'huabei',
    glyph: '北',
    name: '华北',
    nameEn: 'North China',
    count: 2,
    universities: [
      {
        name: '北京大学 · Peking University',
        professors: [
          {
            id: 'pku-1',
            name: '包华石',
            nameEn: 'Martin Powers',
            title: 'professor',
            university: '北京大学 · Peking University',
            specialties: ['中国绘画史'],
            bio: '',
            achievements: [],
            publications: [],
          },
          {
            id: 'pku-2',
            name: '陈轩',
            nameEn: '',
            title: 'associate',
            university: '北京大学 · Peking University',
            specialties: ['美术考古'],
            bio: '',
            achievements: [],
            publications: [],
          },
        ],
      },
    ],
  },
  {
    id: 'north-america',
    glyph: '美',
    name: '北美',
    nameEn: 'North America',
    count: 1,
    universities: [
      {
        name: '多伦多大学 · University of Toronto',
        country: '加拿大',
        professors: [
          {
            id: 'toronto-1',
            name: '示例学者',
            nameEn: '',
            title: 'professor',
            university: '多伦多大学 · University of Toronto',
            specialties: [],
            bio: '',
            achievements: [],
            publications: [],
          },
        ],
      },
    ],
  },
  {
    id: 'europe',
    glyph: '欧',
    name: '欧洲',
    nameEn: 'Europe',
    count: 1,
    universities: [
      {
        name: '维也纳大学 · University of Vienna',
        country: '奥地利',
        professors: [
          {
            id: 'vienna-1',
            name: '示例学者',
            nameEn: '',
            title: 'professor',
            university: '维也纳大学 · University of Vienna',
            specialties: [],
            bio: '',
            achievements: [],
            publications: [],
          },
        ],
      },
    ],
  },
];

const directory = buildAcademyDirectory(regions, normalizeAcademyConfig({
  universities: [
    {
      id: 'pku',
      nameZh: '北京大学',
      nameEn: 'Peking University',
      regionId: 'huabei',
      country: '中国',
      academies: [
        { id: 'pku-art', label: '艺术学院', url: 'https://www.art.pku.edu.cn/' },
      ],
    },
  ],
}));

assert.equal(directory.length, 3);
assert.deepEqual(
  directory.map((school) => school.regionGroup),
  ['china', 'north-america', 'europe'],
);
assert.equal(directory[0].nameZh, '北京大学');
assert.equal(directory[0].nameEn, 'Peking University');
assert.equal(directory[0].scholarCount, 2);
assert.deepEqual(directory[0].academies, [
  {
    id: 'pku-art',
    label: '艺术学院',
    url: 'https://www.art.pku.edu.cn/',
  },
]);
assert.equal(directory[0].subregionKey, 'huabei');
assert.equal(directory[0].subregionLabel, '华北');
assert.equal(directory[1].subregionKey, '加拿大');
assert.equal(directory[1].subregionLabel, '加拿大');
assert.equal(directory[2].subregionKey, '奥地利');
assert.equal(directory[2].subregionLabel, '奥地利');
assert.deepEqual(directory[2].academies, []);

assert.deepEqual(getAcademySubregionOptions(directory, 'china'), [
  { key: 'all', label: '全部' },
  { key: 'huabei', label: '华北' },
]);
assert.deepEqual(getAcademySubregionOptions(directory, 'north-america'), [
  { key: 'all', label: '全部' },
  { key: '加拿大', label: '加拿大' },
]);
assert.equal(matchesAcademySubregion(directory[1], '加拿大'), true);
assert.equal(matchesAcademySubregion(directory[1], '美国'), false);

console.log('academy directory checks passed');
