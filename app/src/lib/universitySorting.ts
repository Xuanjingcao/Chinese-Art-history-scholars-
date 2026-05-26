import { getUniversityNameParts } from './universityNames.ts';

const universityNameCollator = new Intl.Collator('zh-Hans-u-co-pinyin', {
  sensitivity: 'base',
  numeric: true,
});

const englishUniversityNameCollator = new Intl.Collator('en', {
  sensitivity: 'base',
  numeric: true,
});

type UniversitySortOptions = {
  preferEnglish?: boolean;
};

function normalizeEnglishUniversitySortKey(name: string) {
  const { nameZh, nameEn } = getUniversityNameParts(name);
  return (nameEn || nameZh).trim().toLocaleUpperCase('en-US');
}

export function compareUniversityNames(a: string, b: string, options: UniversitySortOptions = {}) {
  const aParts = getUniversityNameParts(a);
  const bParts = getUniversityNameParts(b);

  if (options.preferEnglish) {
    const byEnglishName = englishUniversityNameCollator.compare(
      normalizeEnglishUniversitySortKey(a),
      normalizeEnglishUniversitySortKey(b),
    );

    if (byEnglishName !== 0) return byEnglishName;
  }

  const byChineseName = universityNameCollator.compare(aParts.nameZh, bParts.nameZh);

  if (byChineseName !== 0) return byChineseName;
  return universityNameCollator.compare(aParts.nameEn, bParts.nameEn);
}

export function sortByUniversityName<T extends { name: string }>(
  universities: T[],
  options: UniversitySortOptions = {},
) {
  return [...universities].sort((a, b) => compareUniversityNames(a.name, b.name, options));
}
