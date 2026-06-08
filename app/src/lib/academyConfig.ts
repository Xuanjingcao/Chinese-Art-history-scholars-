import { getUniversityCountry, getUniversityNameParts } from './universityNames.ts';
import type { ProfessorRecord } from '../types/index.ts';

export type AcademyWebsite = {
  id: string;
  label: string;
  url: string;
};

export type AcademyUniversityConfig = {
  id: string;
  nameZh: string;
  nameEn: string;
  regionId: ProfessorRecord['regionId'];
  country: string;
  academies: AcademyWebsite[];
};

export type AcademyConfig = {
  universities: AcademyUniversityConfig[];
};

export const emptyAcademyConfig: AcademyConfig = {
  universities: [],
};

export const academyConfigValidationMessage = '请补齐院校名称，以及每条学院官网的学院名称和链接。';

const validRegionIds = new Set<ProfessorRecord['regionId']>([
  'huabei',
  'huadong',
  'huanan',
  'zhongxibu',
  'gangtai',
  'north-america',
  'europe',
  'japan',
]);

function normalizeUrl(value: unknown) {
  if (typeof value !== 'string') return '';

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function normalizeAcademyWebsite(value: unknown): AcademyWebsite | null {
  if (!value || typeof value !== 'object') return null;

  const academy = value as Record<string, unknown>;
  const id = typeof academy.id === 'string' ? academy.id.trim() : '';
  const label = typeof academy.label === 'string' ? academy.label.trim() : '';
  const url = normalizeUrl(academy.url);

  if (!id || !label || !url) return null;
  return { id, label, url };
}

function isBlankAcademyWebsiteDraft(academy: AcademyWebsite) {
  return !academy.label.trim() && !academy.url.trim();
}

function trimAcademyWebsiteDraft(academy: AcademyWebsite): AcademyWebsite {
  return {
    id: academy.id.trim(),
    label: academy.label.trim(),
    url: academy.url.trim(),
  };
}

function isBlankAcademyUniversityDraft(university: AcademyUniversityConfig) {
  return !university.nameZh.trim()
    && !university.nameEn.trim()
    && !university.country.trim()
    && university.academies.length === 0;
}

function trimAcademyUniversityDraft(university: AcademyUniversityConfig): AcademyUniversityConfig {
  return {
    ...university,
    id: university.id.trim(),
    nameZh: university.nameZh.trim(),
    nameEn: university.nameEn.trim(),
    country: university.country.trim(),
    academies: university.academies
      .map(trimAcademyWebsiteDraft)
      .filter((academy) => !isBlankAcademyWebsiteDraft(academy)),
  };
}

function normalizeAcademyUniversity(value: unknown): AcademyUniversityConfig | null {
  if (!value || typeof value !== 'object') return null;

  const university = value as Record<string, unknown>;
  const id = typeof university.id === 'string' ? university.id.trim() : '';
  const nameZh = typeof university.nameZh === 'string' ? university.nameZh.trim() : '';
  const nameEn = typeof university.nameEn === 'string' ? university.nameEn.trim() : '';
  const country = typeof university.country === 'string' ? university.country.trim() : '';
  const regionId = university.regionId;
  const academies = Array.isArray(university.academies)
    ? university.academies
      .map(normalizeAcademyWebsite)
      .filter((academy): academy is AcademyWebsite => Boolean(academy))
    : [];

  if (!id || (!nameZh && !nameEn) || typeof regionId !== 'string' || !validRegionIds.has(regionId as ProfessorRecord['regionId'])) {
    return null;
  }

  return {
    id,
    nameZh,
    nameEn,
    regionId: regionId as ProfessorRecord['regionId'],
    country,
    academies,
  };
}

export function normalizeAcademyConfig(value: unknown): AcademyConfig {
  if (!value || typeof value !== 'object') return emptyAcademyConfig;

  const config = value as Record<string, unknown>;
  return {
    universities: Array.isArray(config.universities)
      ? config.universities
        .map(normalizeAcademyUniversity)
        .filter((university): university is AcademyUniversityConfig => Boolean(university))
      : [],
  };
}

export function prepareAcademyConfigForSave(config: AcademyConfig): AcademyConfig {
  return {
    universities: config.universities
      .map(trimAcademyUniversityDraft)
      .filter((university) => !isBlankAcademyUniversityDraft(university)),
  };
}

export function getAcademyConfigValidationMessage(config: AcademyConfig) {
  const hasInvalidUniversity = config.universities.some((university) => !university.nameZh.trim() && !university.nameEn.trim());
  const hasInvalidAcademy = config.universities.some((university) =>
    university.academies.some((academy) => !academy.label.trim() || !normalizeUrl(academy.url)),
  );

  return hasInvalidUniversity || hasInvalidAcademy ? academyConfigValidationMessage : '';
}

function createProfessorUniversityConfig(record: ProfessorRecord): AcademyUniversityConfig {
  const { nameZh, nameEn } = getUniversityNameParts(record.university);
  return {
    id: `professor-university-${record.regionId}-${encodeURIComponent((nameZh || nameEn).toLocaleLowerCase('en-US'))}`,
    nameZh,
    nameEn,
    regionId: record.regionId,
    country: record.country || (['huabei', 'huadong', 'huanan', 'zhongxibu', 'gangtai'].includes(record.regionId) ? '中国' : getUniversityCountry(record.university)),
    academies: [],
  };
}

export function mergeAcademyConfigWithProfessorRecords(
  records: ProfessorRecord[],
  config: AcademyConfig,
): AcademyConfig {
  const universityByName = new Map(
    config.universities.map((university) => [university.nameZh || university.nameEn, university]),
  );

  records.forEach((record) => {
    const candidate = createProfessorUniversityConfig(record);
    const key = candidate.nameZh || candidate.nameEn;
    if (!universityByName.has(key)) {
      universityByName.set(key, candidate);
    }
  });

  return {
    universities: Array.from(universityByName.values()),
  };
}
