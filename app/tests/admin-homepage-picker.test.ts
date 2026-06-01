import assert from 'node:assert/strict';
import {
  buildAdminHomepagePickerData,
  getAdminHomepageRegionOptions,
} from '../src/lib/adminHomepagePicker.ts';
import type { ProfessorRecord } from '../src/types/index.ts';

function createRecord(
  id: string,
  name: string,
  university: string,
  regionId: ProfessorRecord['regionId'],
  regionName: string,
  regionOrder: number,
): ProfessorRecord {
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
    regionId,
    regionGlyph: regionName.slice(0, 1),
    regionName,
    regionNameEn: '',
    regionOrder,
  };
}

const records = [
  createRecord('p001', '郑岩', '北京大学 · Peking University', 'huabei', '华北地区', 0),
  createRecord('p002', '包华石', '北京大学 · Peking University', 'huabei', '华北地区', 0),
  createRecord('p003', '巫鸿', '芝加哥大学 · University of Chicago', 'north-america', '北美地区', 6),
];

assert.deepEqual(getAdminHomepageRegionOptions(records), [
  { value: 'all', label: '全部地区' },
  { value: 'huabei', label: '华北地区' },
  { value: 'north-america', label: '北美地区' },
]);

assert.deepEqual(buildAdminHomepagePickerData(records, 'huabei'), {
  professorGroups: [
    {
      label: '北京大学',
      options: [
        { value: 'p002', label: '包华石' },
        { value: 'p001', label: '郑岩' },
      ],
    },
  ],
  universityOptions: [
    { value: '北京大学', label: '北京大学 · Peking University' },
  ],
});

assert.deepEqual(buildAdminHomepagePickerData(records, 'north-america'), {
  professorGroups: [
    {
      label: '芝加哥大学',
      options: [
        { value: 'p003', label: '巫鸿' },
      ],
    },
  ],
  universityOptions: [
    { value: '芝加哥大学', label: '芝加哥大学 · University of Chicago' },
  ],
});

console.log('admin homepage picker checks passed');
