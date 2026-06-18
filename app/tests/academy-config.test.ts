import assert from 'node:assert/strict';
import {
  filterAcademyUniversitiesByWebsiteStatus,
  getAcademyCoverageStats,
  getAcademyConfigValidationMessage,
  mergeAcademyConfigWithProfessorRecords,
  normalizeAcademyConfig,
  prepareAcademyConfigForSave,
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
assert.deepEqual(getAcademyCoverageStats(directory), {
  total: 2,
  withWebsites: 2,
  withoutWebsites: 0,
  websiteTotal: 2,
});

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
  {
    id: 'leiden-1',
    name: '林凡',
    nameEn: 'Fan Lin',
    title: 'lecturer',
    university: '莱顿大学 · Leiden University',
    country: '荷兰',
    specialties: [],
    bio: '',
    achievements: [],
    publications: [],
    regionId: 'europe',
    regionGlyph: '欧',
    regionName: '欧洲地区',
    regionNameEn: 'Europe',
    regionOrder: 7,
  },
];

const merged = mergeAcademyConfigWithProfessorRecords(professorRecords, {
  universities: [
    ...config.universities,
    {
      id: 'stale-leiden',
      nameZh: '莱顿大学',
      nameEn: 'Leiden University',
      regionId: 'huabei',
      country: '中国',
      academies: [],
    },
  ],
});
const nankai = merged.universities.find((university) => university.nameZh === '南开大学');
const leiden = merged.universities.find((university) => university.nameZh === '莱顿大学');

assert.equal(merged.universities.length, 4);
assert.equal(nankai?.nameEn, 'Nankai University');
assert.equal(nankai?.regionId, 'huabei');
assert.equal(nankai?.country, '中国');
assert.deepEqual(nankai?.academies, []);
assert.equal(leiden?.regionId, 'europe');
assert.equal(leiden?.country, '荷兰');
assert.deepEqual(leiden?.academies, []);
assert.deepEqual(getAcademyCoverageStats(merged.universities), {
  total: 4,
  withWebsites: 2,
  withoutWebsites: 2,
  websiteTotal: 2,
});
assert.deepEqual(
  filterAcademyUniversitiesByWebsiteStatus(merged.universities, 'with-websites').map((university) => university.nameZh),
  ['北京大学', '示例艺术大学'],
);
assert.deepEqual(
  filterAcademyUniversitiesByWebsiteStatus(merged.universities, 'without-websites').map((university) => university.nameZh),
  ['莱顿大学', '南开大学'],
);
assert.deepEqual(
  filterAcademyUniversitiesByWebsiteStatus(merged.universities, 'all').map((university) => university.nameZh),
  ['北京大学', '示例艺术大学', '莱顿大学', '南开大学'],
);

const saveReadyConfig = prepareAcademyConfigForSave({
  universities: [
    {
      id: 'empty-draft',
      nameZh: '',
      nameEn: '',
      regionId: 'north-america',
      country: '',
      academies: [],
    },
    {
      id: 'uva',
      nameZh: '弗吉尼亚大学',
      nameEn: 'University of Virginia',
      regionId: 'north-america',
      country: '美国',
      academies: [
        { id: 'uva-art', label: 'Department of Art', url: 'https://art.as.virginia.edu' },
      ],
    },
  ],
});

assert.equal(getAcademyConfigValidationMessage(saveReadyConfig), '');
assert.deepEqual(saveReadyConfig.universities.map((university) => university.id), ['uva']);

const unnamedWithAcademyConfig = prepareAcademyConfigForSave({
  universities: [
    {
      id: 'partial-draft',
      nameZh: '',
      nameEn: '',
      regionId: 'north-america',
      country: '',
      academies: [
        { id: 'partial-art', label: 'Department of Art', url: 'https://art.as.virginia.edu' },
      ],
    },
  ],
});

assert.equal(
  getAcademyConfigValidationMessage(unnamedWithAcademyConfig),
  '请补齐院校名称，以及每条学院官网的学院名称和链接。',
);

console.log('academy config checks passed');
