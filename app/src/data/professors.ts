import professorData from '@/data/professors.json'
import type { Professor, ProfessorRecord, Region } from '@/types'
import { getCanonicalUniversityKey, getUniversityCountry, getUniversityDisplayName } from '@/lib/universityNames'
import { sortByUniversityName } from '@/lib/universitySorting'

export type ProfessorDataset = {
  professorRecords: ProfessorRecord[]
  regions: Region[]
  totalCount: number
  schoolCoverageCount: number
  regionCount: { key: string; label: string; count: number }[]
  countryCoverageCount: number
}

const overseasRegionIds = new Set(['north-america', 'europe', 'japan'])

export const professorRecords = professorData as ProfessorRecord[]

export function buildRegions(records: ProfessorRecord[]): Region[] {
  const regionMap = new Map<string, {
    id: ProfessorRecord['regionId'];
    glyph: string;
    name: string;
    nameEn: string;
    universities: Map<string, { name: string; country?: string; professors: Professor[] }>;
  }>()

  const orderedRecords = [...records].sort((a, b) => {
    return a.regionOrder - b.regionOrder
  })

  orderedRecords.forEach((record) => {
    const regionEntry = regionMap.get(record.regionId) ?? {
      id: record.regionId,
      glyph: record.regionGlyph,
      name: record.regionName,
      nameEn: record.regionNameEn,
      universities: new Map<string, { name: string; country?: string; professors: Professor[] }>(),
    }

    if (!regionMap.has(record.regionId)) {
      regionMap.set(record.regionId, regionEntry)
    }

    const universityKey = getCanonicalUniversityKey(record.university)
    const universityEntry = regionEntry.universities.get(universityKey) ?? {
      name: getUniversityDisplayName(record.university),
      country: record.country || getUniversityCountry(record.university),
      professors: [],
    }

    if (!regionEntry.universities.has(universityKey)) {
      regionEntry.universities.set(universityKey, universityEntry)
    }

    const professor: Professor = {
      id: record.id,
      name: record.name,
      nameEn: record.nameEn,
      title: record.title,
      university: record.university,
      country: record.country,
      specialties: record.specialties,
      standardTags: record.standardTags,
      bio: record.bio,
      achievements: record.achievements,
      publications: record.publications,
      profileLink: record.profileLink,
      cnkiLink: record.cnkiLink,
      scholarLink: record.scholarLink,
      createdAt: record.createdAt,
    }

    universityEntry.professors.push(professor)
  })

  return Array.from(regionMap.values()).map((regionEntry) => {
    const universities = sortByUniversityName(
      Array.from(regionEntry.universities.values()),
      { preferEnglish: overseasRegionIds.has(regionEntry.id) },
    )
    return {
      id: regionEntry.id,
      glyph: regionEntry.glyph,
      name: regionEntry.name,
      nameEn: regionEntry.nameEn,
      count: universities.reduce((sum, university) => sum + university.professors.length, 0),
      universities,
    }
  })
}

export function buildProfessorDataset(records: ProfessorRecord[]): ProfessorDataset {
  const regions = buildRegions(records)
  const allProfessors = regions.flatMap((region) => region.universities.flatMap((university) => university.professors))

  const countrySet = new Set<string>()

  regions.forEach((region) => {
    if (!overseasRegionIds.has(region.id)) {
      countrySet.add('中国')
      return
    }

    region.universities.forEach((university) => {
      countrySet.add(university.country || getUniversityCountry(university.name))
    })
  })

  return {
    professorRecords: records,
    regions,
    totalCount: allProfessors.length,
    schoolCoverageCount: regions.reduce((sum, region) => sum + region.universities.length, 0),
    regionCount: [
      { key: 'china', label: '中国', count: regions.filter((region) => !overseasRegionIds.has(region.id)).reduce((sum, region) => sum + region.count, 0) },
      { key: 'north-america', label: '北美', count: regions.find((region) => region.id === 'north-america')?.count ?? 0 },
      { key: 'europe', label: '欧洲', count: regions.find((region) => region.id === 'europe')?.count ?? 0 },
      { key: 'japan', label: '日本', count: regions.find((region) => region.id === 'japan')?.count ?? 0 },
    ],
    countryCoverageCount: countrySet.size,
  }
}

export const staticProfessorDataset = buildProfessorDataset(professorRecords)

function shouldFetchLocalProfessorData() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

export async function loadProfessorDataset(): Promise<ProfessorDataset> {
  if (!shouldFetchLocalProfessorData()) {
    return staticProfessorDataset
  }

  try {
    const response = await fetch(`/api/admin/professors?ts=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) return staticProfessorDataset
    const records = (await response.json()) as ProfessorRecord[]
    return buildProfessorDataset(records)
  } catch {
    return staticProfessorDataset
  }
}

export const regions = staticProfessorDataset.regions
export const totalCount = staticProfessorDataset.totalCount
export const schoolCoverageCount = staticProfessorDataset.schoolCoverageCount
export const regionCount = staticProfessorDataset.regionCount
export const countryCoverageCount = staticProfessorDataset.countryCoverageCount
