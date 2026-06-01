import assert from 'node:assert/strict';
import {
  mergeAcademyConfigWithProfessorRecords,
  normalizeAcademyConfig,
} from '../src/lib/academyConfig.ts';
import {
  buildAcademyDirectory,
} from '../src/lib/academyDirectory.ts';
import type { ProfessorRecord, Region } from '../src/types/index.ts';

const regions: Region[] = [
  {
    id: 'huabei',
    glyph: '北',
    name: '华北地区',
    nameEn: 'North China',
    count: 1,
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

const config = normalizeAcademyConfig({
  universities: [
    {
      id: ' pku ',
      nameZh: ' 北京大学 ',
      nameEn: ' Peking University ',
      regionId: 'huabei',
      country: ' 中国 ',
      academies: [
        { id: ' art ', label: ' 艺术学院 ', url: ' https://www.art.pku.edu.cn/ ' },
        { id: ' invalid ', label: '', url: 'not-a-url' },
      ],
    },
    {
      id: ' new-school ',
      nameZh: ' 示例艺术大学 ',
      nameEn: ' Example Arts University ',
      regionId: 'huadong',
      country: ' 中国 ',
      academies: [
        { id: ' humanities ', label: ' 艺术人文学院 ', url: ' https://example.edu/humanities ' },
      ],
    },
  ],
});

assert.deepEqual(config, {
  universities: [
    {
      id: 'pku',
      nameZh: '北京大学',
      nameEn: 'Peking University',
      regionId: 'huabei',
      country: '中国',
      academies: [
        { id: 'art', label: '艺术学院', url: 'https://www.art.pku.edu.cn/' },
      ],
    },
    {
      id: 'new-school',
      nameZh: '示例艺术大学',
      nameEn: 'Example Arts University',
      regionId: 'huadong',
      country: '中国',
      academies: [
        { id: 'humanities', label: '艺术人文学院', url: 'https://example.edu/humanities' },
      ],
    },
  ],
});

const directory = buildAcademyDirectory(regions, config);
const pku = directory.find((school) => school.nameZh === '北京大学');
const example = directory.find((school) => school.nameZh === '示例艺术大学');

assert.equal(directory.length, 2);
assert.equal(pku?.scholarCount, 1);
assert.deepEqual(pku?.academies, [
  { id: 'art', label: '艺术学院', url: 'https://www.art.pku.edu.cn/' },
]);
assert.equal(example?.scholarCount, 0);
assert.equal(example?.regionGroup, 'china');
assert.equal(example?.subregionKey, 'huadong');
assert.deepEqual(example?.academies, [
  { id: 'humanities', label: '艺术人文学院', url: 'https://example.edu/humanities' },
]);

const professorRecords: ProfessorRecord[] = [
  {
    id: 'pku-1',
    name: '包华石',
    nameEn: 'Martin Powers',
    title: 'professor',
    university: '北京大学 · Peking University',
    specialties: [],
    bio: '',
    achievements: [],
    publications: [],
    regionId: 'huabei',
    regionGlyph: '北',
    regionName: '华北地区',
    regionNameEn: 'North China',
    regionOrder: 0,
  },
  {
    id: 'nankai-1',
    name: '示例老师',
    nameEn: '',
    title: 'professor',
    university: '南开大学 · Nankai University',
    specialties: [],
    bio: '',
    achievements: [],
    publications: [],
    regionId: 'huabei',
    regionGlyph: '北',
    regionName: '华北地区',
    regionNameEn: 'North China',
    regionOrder: 0,
  },
];

const merged = mergeAcademyConfigWithProfessorRecords(professorRecords, config);
const nankai = merged.universities.find((university) => university.nameZh === '南开大学');

assert.equal(merged.universities.length, 3);
assert.equal(nankai?.nameEn, 'Nankai University');
assert.equal(nankai?.regionId, 'huabei');
assert.equal(nankai?.country, '中国');
assert.deepEqual(nankai?.academies, []);

console.log('academy config checks passed');
