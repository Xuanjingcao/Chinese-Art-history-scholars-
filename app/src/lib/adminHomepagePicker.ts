import { getUniversityNameParts } from './universityNames.ts';
import type { ProfessorRecord } from '../types/index.ts';

export type AdminHomepageRegionFilter = ProfessorRecord['regionId'] | 'all';

export type AdminHomepagePickerOption = {
  value: string;
  label: string;
};

export type AdminHomepageProfessorGroup = {
  label: string;
  options: AdminHomepagePickerOption[];
};

export function getAdminHomepageRegionOptions(records: ProfessorRecord[]) {
  const regions = new Map<ProfessorRecord['regionId'], { label: string; order: number }>();

  records.forEach((record) => {
    if (!regions.has(record.regionId)) {
      regions.set(record.regionId, { label: record.regionName, order: record.regionOrder });
    }
  });

  return [
    { value: 'all', label: '全部地区' },
    ...Array.from(regions.entries())
      .sort(([, a], [, b]) => a.order - b.order || a.label.localeCompare(b.label, 'zh-CN'))
      .map(([value, region]) => ({ value, label: region.label })),
  ];
}

export function buildAdminHomepagePickerData(
  records: ProfessorRecord[],
  regionFilter: AdminHomepageRegionFilter,
) {
  const filteredRecords = regionFilter === 'all'
    ? records
    : records.filter((record) => record.regionId === regionFilter);
  const professorsByUniversity = new Map<string, AdminHomepagePickerOption[]>();
  const universityByValue = new Map<string, AdminHomepagePickerOption>();

  filteredRecords.forEach((record) => {
    const { nameZh, nameEn } = getUniversityNameParts(record.university);
    const universityValue = nameZh || nameEn || '未填写学校';
    const universityLabel = nameEn ? `${nameZh} · ${nameEn}` : universityValue;
    const professorOptions = professorsByUniversity.get(universityValue) ?? [];

    professorOptions.push({ value: record.id, label: record.name || '未命名老师' });
    professorsByUniversity.set(universityValue, professorOptions);

    if (!universityByValue.has(universityValue)) {
      universityByValue.set(universityValue, { value: universityValue, label: universityLabel });
    }
  });

  return {
    professorGroups: Array.from(professorsByUniversity.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
      .map(([label, options]) => ({
        label,
        options: options.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
      })),
    universityOptions: Array.from(universityByValue.values())
      .sort((a, b) => a.value.localeCompare(b.value, 'zh-CN')),
  };
}
