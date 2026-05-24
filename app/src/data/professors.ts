import professorData from '@/data/professors.json'
import type { Professor, ProfessorRecord, Region } from '@/types'
import { getCanonicalUniversityKey, getUniversityCountry, getUniversityDisplayName } from '@/lib/universityNames'

export interface SpecialtyCategory {
  key: string;
  label: string;
  keywords: string[];
}

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

export const specialtyCategories: SpecialtyCategory[] = [
  { key: 'buddhist', label: '佛教美术', keywords: ['佛教', '石窟', '敦煌', '造像', '摩崖', '藏传佛教', '汉藏佛教', '西夏藏传'] },
  { key: 'calligraphy', label: '书画史', keywords: ['书画', '书法', '绘画史', '山水画', '花鸟画', '文人画', '水墨', '丹青', '画论', '画派', '鉴藏', '古籍', '书论', '书道', '尺牍', '篆刻', '版画', '石涛', '潘天寿', '徐悲鸿', '浙派'] },
  { key: 'tomb', label: '墓葬艺术', keywords: ['墓葬', '丧葬', '墓室', '壁画', '考古'] },
  { key: 'ceramic', label: '陶瓷工艺', keywords: ['陶瓷', '瓷器', '工艺', '玉器', '青铜', '器物', '物质文化', '服饰', '茶文化', '非物质文化遗产'] },
  { key: 'modern', label: '近现代美术', keywords: ['现代', '当代', '近现代', '近代', '20世纪', '都市', '消费', '摄影', '展览', '策展'] },
  { key: 'architecture', label: '建筑空间', keywords: ['建筑', '园林', '空间', '景观', '纪念碑', '教堂'] },
  { key: 'cross_culture', label: '跨文化交流', keywords: ['跨文化', '交流', '东亚', '中日', '中西', '跨国', '亚洲', '海外藏', '丝路', '丝绸之路'] },
  { key: 'theory', label: '艺术理论', keywords: ['理论', '美学', '史学史', '文献', '方法论', '思想', '观念', '图像证史', '视觉叙事', '艺术心理'] },
  { key: 'court', label: '宫廷艺术', keywords: ['宫廷', '画院', '收藏'] },
  { key: 'other', label: '其他', keywords: [] },
];

const allProfessors = regions.flatMap((region) => region.universities.flatMap((university) => university.professors))

export const totalCount = allProfessors.length
export const professorCount = allProfessors.filter((professor) => professor.title === 'professor').length
export const associateCount = allProfessors.filter((professor) => professor.title === 'associate').length
export const assistantCount = allProfessors.filter((professor) => professor.title === 'assistant').length
export const lecturerCount = allProfessors.filter((professor) => professor.title === 'lecturer').length
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
