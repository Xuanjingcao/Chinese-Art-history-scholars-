export type HomepageRecentEntryKind = 'professor' | 'academy' | 'website';

export type HomepageRecentEntry = {
  id: string;
  kind: HomepageRecentEntryKind;
  title: string;
  detail: string;
  recordedAt: string;
  professorRef?: string;
};

export type HomepageContentConfig = {
  recommendedProfessorRefs: string[];
  academyUniversityRefs: string[];
  recentEntries: HomepageRecentEntry[];
};

export const HOMEPAGE_SECTION_LIMITS = {
  recommendedProfessors: 8,
  academyUniversities: 3,
  recentEntries: 3,
} as const;

export const emptyHomepageConfig: HomepageContentConfig = {
  recommendedProfessorRefs: [],
  academyUniversityRefs: [],
  recentEntries: [],
};

function uniqueTrimmedStrings(values: unknown) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeRecentEntry(value: unknown): HomepageRecentEntry | null {
  if (!value || typeof value !== 'object') return null;

  const entry = value as Record<string, unknown>;
  const id = typeof entry.id === 'string' ? entry.id.trim() : '';
  const kind = entry.kind;
  const title = typeof entry.title === 'string' ? entry.title.trim() : '';
  const detail = typeof entry.detail === 'string' ? entry.detail.trim() : '';
  const professorRef = typeof entry.professorRef === 'string' ? entry.professorRef.trim() : '';
  const recordedAt = typeof entry.recordedAt === 'string' ? entry.recordedAt.trim() : '';
  const timestamp = Date.parse(recordedAt);

  if (
    !id
    || !title
    || !Number.isFinite(timestamp)
    || (kind !== 'professor' && kind !== 'academy' && kind !== 'website')
  ) {
    return null;
  }

  return {
    id,
    kind,
    title,
    detail,
    recordedAt: new Date(timestamp).toISOString(),
    ...(professorRef ? { professorRef } : {}),
  };
}

export function normalizeHomepageConfig(value: unknown): HomepageContentConfig {
  if (!value || typeof value !== 'object') return emptyHomepageConfig;

  const config = value as Record<string, unknown>;
  const recentEntries = Array.isArray(config.recentEntries)
    ? config.recentEntries
      .map(normalizeRecentEntry)
      .filter((entry): entry is HomepageRecentEntry => Boolean(entry))
    : [];

  return {
    recommendedProfessorRefs: uniqueTrimmedStrings(config.recommendedProfessorRefs),
    academyUniversityRefs: uniqueTrimmedStrings(config.academyUniversityRefs),
    recentEntries,
  };
}
