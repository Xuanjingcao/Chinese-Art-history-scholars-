import professorData from '@/data/professors.json'
import type { Professor, ProfessorRecord, Region } from '@/types'
import { getCanonicalUniversityKey, getUniversityCountry, getUniversityDisplayName } from '@/lib/universityNames'

export const professorRecords = professorData as ProfessorRecord[]

function buildRegions(records: ProfessorRecord[]): Region[] {
  const regionMap = new Map<string, {
    id: ProfessorRecord['regionId'];
    glyph: string;
    name: string;
    nameEn: string;
    universities: Map<string, { name: string; professors: Professor[] }>;
  }>()

  const orderedRecords = [...records].sort((a, b) => {
    if (a.regionOrder !== b.regionOrder) return a.regionOrder - b.regionOrder
    if (a.universityOrder !== b.universityOrder) return a.universityOrder - b.universityOrder
    return a.professorOrder - b.professorOrder
  })

  orderedRecords.forEach((record) => {
    const regionEntry = regionMap.get(record.regionId) ?? {
      id: record.regionId,
      glyph: record.regionGlyph,
      name: record.regionName,
      nameEn: record.regionNameEn,
      universities: new Map<string, { name: string; professors: Professor[] }>(),
    }

    if (!regionMap.has(record.regionId)) {
      regionMap.set(record.regionId, regionEntry)
    }

    const universityKey = getCanonicalUniversityKey(record.university)
    const universityEntry = regionEntry.universities.get(universityKey) ?? {
      name: getUniversityDisplayName(record.university),
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
      specialties: record.specialties,
      standardTags: record.standardTags,
      bio: record.bio,
      achievements: record.achievements,
      publications: record.publications,
      profileLink: record.profileLink,
      cnkiLink: record.cnkiLink,
      scholarLink: record.scholarLink,
    }

    universityEntry.professors.push(professor)
  })

  return Array.from(regionMap.values()).map((regionEntry) => {
    const universities = Array.from(regionEntry.universities.values())
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

export const regions = buildRegions(professorRecords)

const allProfessors = regions.flatMap((region) => region.universities.flatMap((university) => university.professors))

export const totalCount = allProfessors.length
export const schoolCoverageCount = regions.reduce((sum, region) => sum + region.universities.length, 0)
export const regionCount = [
  { key: 'china', label: '中国', count: regions.filter((region) => !['north-america', 'europe', 'japan'].includes(region.id)).reduce((sum, region) => sum + region.count, 0) },
  { key: 'north-america', label: '北美', count: regions.find((region) => region.id === 'north-america')?.count ?? 0 },
  { key: 'europe', label: '欧洲', count: regions.find((region) => region.id === 'europe')?.count ?? 0 },
  { key: 'japan', label: '日本', count: regions.find((region) => region.id === 'japan')?.count ?? 0 },
]

const overseasRegionIds = new Set(['north-america', 'europe', 'japan'])
const countrySet = new Set<string>()

regions.forEach((region) => {
  if (!overseasRegionIds.has(region.id)) {
    countrySet.add('中国')
    return
  }

  region.universities.forEach((university) => {
    countrySet.add(getUniversityCountry(university.name))
  })
})

export const countryCoverageCount = countrySet.size
