import { getUniversityNameParts } from './universityNames.ts';
import type { AcademyConfig, AcademyUniversityConfig, AcademyWebsite } from './academyConfig.ts';
import type { Region } from '../types/index.ts';

export type AcademyRegionGroup = 'china' | 'japan' | 'north-america' | 'europe';

export type AcademyLink = AcademyWebsite;

export type AcademyDirectoryEntry = {
  key: string;
  nameZh: string;
  nameEn: string;
  country: string;
  regionGroup: AcademyRegionGroup;
  subregionKey: string;
  subregionLabel: string;
  scholarCount: number;
  academies: AcademyLink[];
};

const chinaRegionIds = new Set(['huabei', 'huadong', 'huanan', 'zhongxibu', 'gangtai']);
const chinaSubregionMeta: Record<string, { label: string; order: number }> = {
  huabei: { label: '华北', order: 1 },
  huadong: { label: '华东', order: 2 },
  huanan: { label: '华南', order: 3 },
  zhongxibu: { label: '中西部', order: 4 },
  gangtai: { label: '港澳台', order: 5 },
};

function getRegionGroup(regionId: string): AcademyRegionGroup {
  if (chinaRegionIds.has(regionId)) return 'china';
  if (regionId === 'japan') return 'japan';
  if (regionId === 'europe') return 'europe';
  return 'north-america';
}

function getSubregion(regionId: string, country: string) {
  const chinaSubregion = chinaSubregionMeta[regionId];
  if (chinaSubregion) {
    return { key: regionId, label: chinaSubregion.label };
  }

  const countryLabel = country || '其他';
  return { key: countryLabel, label: countryLabel };
}

function buildAcademyEntryFromConfig(university: AcademyUniversityConfig): AcademyDirectoryEntry {
  const displayKey = university.nameZh || university.nameEn;
  const subregion = getSubregion(university.regionId, university.country);

  return {
    key: `${university.regionId}:${displayKey}`,
    nameZh: university.nameZh,
    nameEn: university.nameEn,
    country: university.country,
    regionGroup: getRegionGroup(university.regionId),
    subregionKey: subregion.key,
    subregionLabel: subregion.label,
    scholarCount: 0,
    academies: university.academies,
  };
}

export function buildAcademyDirectory(regions: Region[], config: AcademyConfig = { universities: [] }): AcademyDirectoryEntry[] {
  const configByUniversity = new Map(
    config.universities.map((university) => [university.nameZh || university.nameEn, university]),
  );
  const directory = regions.flatMap((region) => {
    return region.universities.map((university) => {
      const { nameZh, nameEn } = getUniversityNameParts(university.name);
      const displayKey = nameZh || nameEn;
      const country = university.country || (chinaRegionIds.has(region.id) ? '中国' : '');
      const subregion = getSubregion(region.id, country);
      const academyConfig = configByUniversity.get(displayKey);

      return {
        key: `${region.id}:${displayKey}`,
        nameZh,
        nameEn,
        country,
        regionGroup: getRegionGroup(region.id),
        subregionKey: subregion.key,
        subregionLabel: subregion.label,
        scholarCount: university.professors.length,
        academies: academyConfig?.academies ?? [],
      };
    });
  });

  const existingKeys = new Set(directory.map((entry) => entry.nameZh || entry.nameEn));
  const independentUniversities = config.universities
    .filter((university) => !existingKeys.has(university.nameZh || university.nameEn))
    .map(buildAcademyEntryFromConfig);

  return [...directory, ...independentUniversities];
}

export function getAcademySubregionOptions(
  directory: AcademyDirectoryEntry[],
  regionGroup: AcademyRegionGroup,
) {
  const optionMap = new Map<string, string>();

  directory.forEach((entry) => {
    if (entry.regionGroup === regionGroup) {
      optionMap.set(entry.subregionKey, entry.subregionLabel);
    }
  });

  const options = Array.from(optionMap, ([key, label]) => ({ key, label }));
  options.sort((a, b) => {
    if (regionGroup === 'china') {
      return (chinaSubregionMeta[a.key]?.order ?? 99) - (chinaSubregionMeta[b.key]?.order ?? 99);
    }
    return a.label.localeCompare(b.label, 'zh-CN');
  });

  return [{ key: 'all', label: '全部' }, ...options];
}

export function matchesAcademySubregion(entry: AcademyDirectoryEntry, subregionKey: string) {
  return subregionKey === 'all' || entry.subregionKey === subregionKey;
}

export function matchesAcademyQuery(entry: AcademyDirectoryEntry, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');
  if (!normalizedQuery) return true;

  return [
    entry.nameZh,
    entry.nameEn,
    entry.country,
    ...entry.academies.map((academy) => academy.label),
  ].some((value) => value.toLocaleLowerCase('en-US').includes(normalizedQuery));
}
