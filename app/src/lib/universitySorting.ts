import { getUniversityNameParts } from './universityNames';

const universityNameCollator = new Intl.Collator('zh-Hans-u-co-pinyin', {
  sensitivity: 'base',
  numeric: true,
});

export function compareUniversityNames(a: string, b: string) {
  const aParts = getUniversityNameParts(a);
  const bParts = getUniversityNameParts(b);
  const byChineseName = universityNameCollator.compare(aParts.nameZh, bParts.nameZh);

  if (byChineseName !== 0) return byChineseName;
  return universityNameCollator.compare(aParts.nameEn, bParts.nameEn);
}

export function sortByUniversityName<T extends { name: string }>(universities: T[]) {
  return [...universities].sort((a, b) => compareUniversityNames(a.name, b.name));
}
