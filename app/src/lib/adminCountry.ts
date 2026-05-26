import type { ProfessorRecord } from '../types';
import { getUniversityCountry } from './universityNames.ts';

export const countryOptionsByRegion: Partial<Record<ProfessorRecord['regionId'], string[]>> = {
  'north-america': ['美国', '加拿大', '墨西哥', '其他'],
  europe: ['英国', '德国', '法国', '奥地利', '荷兰', '比利时', '意大利', '西班牙', '瑞士', '瑞典', '丹麦', '挪威', '其他'],
};

export function getCountryOptions(regionId: ProfessorRecord['regionId']) {
  return countryOptionsByRegion[regionId] ?? [];
}

export function getDefaultCountry(regionId: ProfessorRecord['regionId'], university = '') {
  const options = getCountryOptions(regionId);
  if (options.length === 0) return '';
  if (university.trim()) {
    const inferred = getUniversityCountry(university);
    if (options.includes(inferred)) return inferred;
  }
  return options[0];
}

export function shouldShowCountry(regionId: ProfessorRecord['regionId']) {
  return getCountryOptions(regionId).length > 0;
}

export function normalizeCountryForRegion(
  regionId: ProfessorRecord['regionId'],
  country = '',
  university = '',
) {
  const options = getCountryOptions(regionId);
  if (options.length === 0) return '';
  return options.includes(country) ? country : getDefaultCountry(regionId, university);
}
