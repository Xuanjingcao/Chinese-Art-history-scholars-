import { getUniversityNameParts } from './universityNames.ts';
import type { ProfessorRecord, Region } from '../types/index.ts';

export type RecentProfessorEntry = {
  professor: ProfessorRecord;
  recordedAt: string;
};

export type PopularUniversityEntry = {
  key: string;
  nameZh: string;
  nameEn: string;
  scholarCount: number;
};

const recommendedProfessorNames = ['包华石', '巫鸿', '曹意强', '郑岩'];

function toIsoDate(value: string | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function getProfessorRecordedAt(professor: Pick<ProfessorRecord, 'id' | 'createdAt'>) {
  const explicitDate = toIsoDate(professor.createdAt);
  if (explicitDate) return explicitDate;

  const timestampMatch = professor.id.match(/^prof-(\d{13})(?:-|$)/);
  if (!timestampMatch) return null;

  return toIsoDate(new Date(Number(timestampMatch[1])).toISOString());
}

export function getRecentProfessorEntries(
  professors: ProfessorRecord[],
  options: {
    now?: Date;
    withinDays?: number;
    limit?: number;
  } = {},
) {
  const now = options.now ?? new Date();
  const withinDays = options.withinDays ?? 14;
  const limit = options.limit ?? 3;
  const latestTimestamp = now.getTime();
  const earliestTimestamp = latestTimestamp - withinDays * 24 * 60 * 60 * 1000;

  return professors
    .flatMap((professor) => {
      const recordedAt = getProfessorRecordedAt(professor);
      if (!recordedAt) return [];

      const timestamp = Date.parse(recordedAt);
      if (timestamp < earliestTimestamp || timestamp > latestTimestamp) return [];

      return [{ professor, recordedAt }];
    })
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, limit);
}

export function getRecommendedProfessors(professors: ProfessorRecord[], limit = 4) {
  const professorByName = new Map(professors.map((professor) => [professor.name, professor]));
  const recommended = recommendedProfessorNames
    .map((name) => professorByName.get(name))
    .filter((professor): professor is ProfessorRecord => Boolean(professor));

  if (recommended.length >= limit) return recommended.slice(0, limit);

  const recommendedIds = new Set(recommended.map((professor) => professor.id));
  const fallback = professors.filter((professor) => !recommendedIds.has(professor.id));
  return [...recommended, ...fallback].slice(0, limit);
}

function getUniversityEntries(regions: Region[]) {
  return regions
    .flatMap((region) => region.universities)
    .map((university) => {
      const { nameZh, nameEn } = getUniversityNameParts(university.name);
      return {
        key: `${nameZh}:${nameEn}`,
        nameZh: nameZh || nameEn,
        nameEn,
        scholarCount: university.professors.length,
      };
    });
}

export function getPopularUniversities(regions: Region[], limit = 3): PopularUniversityEntry[] {
  return getUniversityEntries(regions)
    .sort((a, b) => b.scholarCount - a.scholarCount || a.nameZh.localeCompare(b.nameZh, 'zh-CN'))
    .slice(0, limit);
}

export function getHomepageRecommendedProfessors(
  professors: ProfessorRecord[],
  references: string[],
  limit = 4,
) {
  if (references.length === 0) return getRecommendedProfessors(professors, limit);

  const professorByReference = new Map<string, ProfessorRecord>();
  professors.forEach((professor) => {
    professorByReference.set(professor.id, professor);
    professorByReference.set(professor.name, professor);
  });

  const configured = references
    .map((reference) => professorByReference.get(reference))
    .filter((professor): professor is ProfessorRecord => Boolean(professor));
  const configuredIds = new Set(configured.map((professor) => professor.id));
  const fallback = getRecommendedProfessors(professors, professors.length)
    .filter((professor) => !configuredIds.has(professor.id));

  return [...configured, ...fallback].slice(0, limit);
}

export function getMissingHomepageProfessorRefs(
  professors: ProfessorRecord[],
  references: string[],
) {
  const knownReferences = new Set(
    professors.flatMap((professor) => [professor.id, professor.name]),
  );

  return references.filter((reference) => !knownReferences.has(reference));
}

export function getHomepageUniversities(
  regions: Region[],
  references: string[],
  limit = 3,
): PopularUniversityEntry[] {
  if (references.length === 0) return getPopularUniversities(regions, limit);

  const universities = getUniversityEntries(regions);
  const universityByReference = new Map<string, PopularUniversityEntry>();

  universities.forEach((university) => {
    universityByReference.set(university.key, university);
    universityByReference.set(university.nameZh, university);
    universityByReference.set(university.nameEn, university);
  });

  const configured = references
    .map((reference) => universityByReference.get(reference))
    .filter((university): university is PopularUniversityEntry => Boolean(university));
  const configuredKeys = new Set(configured.map((university) => university.key));
  const fallback = getPopularUniversities(regions, universities.length)
    .filter((university) => !configuredKeys.has(university.key));

  return [...configured, ...fallback].slice(0, limit);
}
