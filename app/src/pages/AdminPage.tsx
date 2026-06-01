import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Building2, CalendarPlus, Link2, Plus, Save, Search, Trash2 } from 'lucide-react'
import type { ProfessorRecord } from '@/types'
import { loadHomepageConfig, staticHomepageConfig } from '@/data/homepage'
import {
  HOMEPAGE_SECTION_LIMITS,
  normalizeHomepageConfig,
  type HomepageContentConfig,
  type HomepageRecentEntry,
  type HomepageRecentEntryKind,
} from '@/lib/homepageConfig'
import { getUniversityDisplayName, getUniversityNameParts } from '@/lib/universityNames'
import {
  getCountryOptions,
  getDefaultCountry,
  normalizeCountryForRegion,
  shouldShowCountry,
} from '@/lib/adminCountry'
import { standardTagOptions } from '@/lib/standardTags'
import { getMissingHomepageProfessorRefs } from '@/lib/homeDiscovery'
import {
  buildAdminHomepagePickerData,
  getAdminHomepageRegionOptions,
  type AdminHomepagePickerOption,
  type AdminHomepageProfessorGroup,
  type AdminHomepageRegionFilter,
} from '@/lib/adminHomepagePicker'
import { loadAcademyConfig, staticAcademyConfig } from '@/data/academies'
import {
  mergeAcademyConfigWithProfessorRecords,
  normalizeAcademyConfig,
  type AcademyConfig,
  type AcademyUniversityConfig,
} from '@/lib/academyConfig'

const regionOptions = [
  { id: 'huabei', glyph: '北', name: '华北地区', nameEn: 'North China', order: 0 },
  { id: 'huadong', glyph: '东', name: '华东地区', nameEn: 'East China', order: 1 },
  { id: 'huanan', glyph: '南', name: '华南地区', nameEn: 'South China', order: 2 },
  { id: 'zhongxibu', glyph: '中', name: '中西部地区', nameEn: 'Central & West China', order: 3 },
  { id: 'gangtai', glyph: '港', name: '港澳台地区', nameEn: 'Hong Kong, Macau & Taiwan', order: 4 },
  { id: 'japan', glyph: '日', name: '日本', nameEn: 'Japan', order: 5 },
  { id: 'north-america', glyph: '美', name: '北美地区', nameEn: 'North America', order: 6 },
  { id: 'europe', glyph: '欧', name: '欧洲地区', nameEn: 'Europe', order: 7 },
] as const

const titleOptions = [
  { value: 'professor', label: '教授' },
  { value: 'associate', label: '副教授' },
  { value: 'assistant', label: '助理教授' },
  { value: 'lecturer', label: '讲师' },
] as const

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type HomepageRecentDraft = {
  kind: HomepageRecentEntryKind
  title: string
  detail: string
  recordedAt: string
  professorRef: string
}

type BatchImportState = {
  regionId: ProfessorRecord['regionId']
  country: string
  schoolZh: string
  schoolEn: string
  teacherLines: string
}

const batchLineExample = '姓名 | 英文名 | 职称 | 标准标签(、分隔) | 研究方向(、分隔)'

const homepageRecentKindOptions = [
  { value: 'professor', label: '新增学者' },
  { value: 'academy', label: '新增院校' },
  { value: 'website', label: '官网更新' },
] as const

function createLocalProfessorId() {
  return `prof-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createHomepageRecentDraft(): HomepageRecentDraft {
  return {
    kind: 'professor',
    title: '',
    detail: '',
    recordedAt: new Date().toISOString().slice(0, 10),
    professorRef: '',
  }
}

function createHomepageRecentEntryId() {
  return `home-recent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createAcademyUniversityId() {
  return `academy-university-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createAcademyWebsiteId() {
  return `academy-website-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createBlankAcademyUniversity(): AcademyUniversityConfig {
  return {
    id: createAcademyUniversityId(),
    nameZh: '',
    nameEn: '',
    regionId: 'huabei',
    country: '中国',
    academies: [],
  }
}

function moveListItem<T>(items: T[], index: number, offset: -1 | 1) {
  const targetIndex = index + offset
  if (targetIndex < 0 || targetIndex >= items.length) return items

  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(targetIndex, 0, item)
  return next
}

function createBlankProfessor(base?: Partial<ProfessorRecord>): ProfessorRecord {
  const defaultRegion = regionOptions[0]
  const regionId = base?.regionId ?? defaultRegion.id
  const university = base?.university ?? ''
  return {
    id: createLocalProfessorId(),
    name: '',
    nameEn: '',
    title: 'professor',
    university,
    country: normalizeCountryForRegion(regionId, base?.country, university),
    specialties: [],
    standardTags: [],
    bio: '',
    achievements: [],
    publications: [],
    profileLink: '',
    cnkiLink: '',
    scholarLink: '',
    createdAt: new Date().toISOString(),
    regionId,
    regionGlyph: base?.regionGlyph ?? defaultRegion.glyph,
    regionName: base?.regionName ?? defaultRegion.name,
    regionNameEn: base?.regionNameEn ?? defaultRegion.nameEn,
    regionOrder: base?.regionOrder ?? defaultRegion.order,
  }
}

function createInitialBatchImportState(): BatchImportState {
  return {
    regionId: regionOptions[0].id,
    country: '',
    schoolZh: '',
    schoolEn: '',
    teacherLines: '',
  }
}

function parseTitleLabel(value: string): ProfessorRecord['title'] {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return 'professor'
  if (normalized === '教授' || normalized === 'professor') return 'professor'
  if (normalized === '副教授' || normalized === 'associate') return 'associate'
  if (normalized === '助理教授' || normalized === 'assistant') return 'assistant'
  if (normalized === '讲师' || normalized === 'lecturer') return 'lecturer'
  return 'professor'
}

function splitInlineValues(value: string) {
  return value
    .split(/[、,，/]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseBatchTeacherLines(batch: BatchImportState) {
  const region = regionOptions.find((option) => option.id === batch.regionId) ?? regionOptions[0]
  const university = combineUniversityName(batch.schoolZh, batch.schoolEn)
  const lines = batch.teacherLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const errors: string[] = []
  const nextRecords: ProfessorRecord[] = []

  if (!batch.schoolZh.trim()) {
    errors.push('请先填写学校中文。')
  }

  lines.forEach((line, index) => {
    const parts = line.split(/[|｜\t]/g).map((part) => part.trim())
    const [name = '', nameEn = '', titleLabel = '', standardTagsRaw = '', specialtiesRaw = ''] = parts

    if (!name) {
      errors.push(`第 ${index + 1} 行缺少老师姓名。`)
      return
    }

    nextRecords.push({
      id: createLocalProfessorId(),
      name,
      nameEn,
      title: parseTitleLabel(titleLabel),
      university,
      specialties: splitInlineValues(specialtiesRaw),
      standardTags: splitInlineValues(standardTagsRaw),
      bio: '',
      achievements: [],
      publications: [],
      profileLink: '',
      cnkiLink: '',
      scholarLink: '',
      createdAt: new Date().toISOString(),
      regionId: region.id,
      regionGlyph: region.glyph,
      regionName: region.name,
      regionNameEn: region.nameEn,
      regionOrder: region.order,
      country: normalizeCountryForRegion(region.id, batch.country, university),
    })
  })

  return { errors, nextRecords }
}

function splitListInput(value: string) {
  return value
    .split(/[\n；;]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinListInput(values: string[]) {
  return values.join('；')
}

function combineUniversityName(nameZh: string, nameEn: string) {
  const hasZh = nameZh.trim().length > 0
  const hasEn = nameEn.trim().length > 0
  if (hasZh && hasEn) return `${nameZh} · ${nameEn}`
  if (hasZh) return nameZh
  if (hasEn) return nameEn
  return ''
}

function normalizeRecordsForSave(records: ProfessorRecord[]) {
  const regionOrderMap = new Map(regionOptions.map((region) => [region.id, region]))
  const idUsageMap = new Map<string, number>()

  return records.map((record) => {
    const region = regionOrderMap.get(record.regionId) ?? regionOptions[0]
    const normalizedUniversity = getUniversityDisplayName(record.university.trim())

    const normalizedId = record.id.trim() || `prof-${Date.now()}`
    const duplicateCount = idUsageMap.get(normalizedId) ?? 0
    idUsageMap.set(normalizedId, duplicateCount + 1)
    const uniqueId = duplicateCount === 0 ? normalizedId : `${normalizedId}-${duplicateCount + 1}`

    return {
      ...record,
      id: uniqueId,
      name: record.name.trim(),
      nameEn: record.nameEn.trim(),
      university: normalizedUniversity,
      bio: record.bio.trim(),
      profileLink: record.profileLink?.trim() || '',
      cnkiLink: record.cnkiLink?.trim() || '',
      scholarLink: record.scholarLink?.trim() || '',
      country: normalizeCountryForRegion(record.regionId, record.country?.trim(), normalizedUniversity),
      standardTags: (record.standardTags ?? []).filter(Boolean),
      regionGlyph: region.glyph,
      regionName: region.name,
      regionNameEn: region.nameEn,
      regionOrder: region.order,
      specialties: record.specialties.filter(Boolean),
      achievements: record.achievements.filter(Boolean),
      publications: record.publications.filter(Boolean),
    }
  })
}

export default function AdminPage() {
  const [records, setRecords] = useState<ProfessorRecord[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [standardTagsDraft, setStandardTagsDraft] = useState('')
  const [specialtiesDraft, setSpecialtiesDraft] = useState('')
  const [achievementsDraft, setAchievementsDraft] = useState('')
  const [publicationsDraft, setPublicationsDraft] = useState('')
  const [showBatchImport, setShowBatchImport] = useState(false)
  const [batchImport, setBatchImport] = useState<BatchImportState>(createInitialBatchImportState)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [homepageConfig, setHomepageConfig] = useState<HomepageContentConfig>(staticHomepageConfig)
  const [homepageSaveState, setHomepageSaveState] = useState<SaveState>('idle')
  const [homepageErrorMessage, setHomepageErrorMessage] = useState('')
  const [academyConfig, setAcademyConfig] = useState<AcademyConfig>(staticAcademyConfig)
  const [academySaveState, setAcademySaveState] = useState<SaveState>('idle')
  const [academyErrorMessage, setAcademyErrorMessage] = useState('')
  const editorSectionRef = useRef<HTMLElement>(null)
  const shouldRevealEditorRef = useRef(false)
  const standardTagsDraftRecordIdRef = useRef('')
  const standardTagsCanonicalDraftRef = useRef('')
  const specialtiesDraftRecordIdRef = useRef('')
  const specialtiesCanonicalDraftRef = useRef('')
  const achievementsDraftRecordIdRef = useRef('')
  const achievementsCanonicalDraftRef = useRef('')
  const publicationsDraftRecordIdRef = useRef('')
  const publicationsCanonicalDraftRef = useRef('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/professors')
      .then((response) => response.json())
      .then((data: ProfessorRecord[]) => {
        if (cancelled) return
        setRecords(data)
        setSelectedId(data[0]?.id ?? '')
      })
      .catch(() => {
        if (cancelled) return
        setSaveState('error')
        setErrorMessage('读取老师数据失败，请确认本地开发服务器正在运行。')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadAcademyConfig()
      .then((config) => {
        if (!cancelled) setAcademyConfig(config)
      })
      .catch(() => {
        if (cancelled) return
        setAcademySaveState('error')
        setAcademyErrorMessage('读取学院官网目录失败，请确认本地开发服务器正在运行。')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadHomepageConfig()
      .then((config) => {
        if (!cancelled) setHomepageConfig(config)
      })
      .catch(() => {
        if (cancelled) return
        setHomepageSaveState('error')
        setHomepageErrorMessage('读取首页内容配置失败，请确认本地开发服务器正在运行。')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return records
    return records.filter((record) =>
      [record.name, record.nameEn, record.university, record.country ?? '', record.regionName, ...record.specialties]
        .concat(record.standardTags ?? [])
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [records, search])

  const filteredRecordIdsKey = useMemo(
    () => filteredRecords.map((record) => record.id).join('|'),
    [filteredRecords],
  )

  const selectedRecord = useMemo(
    () => filteredRecords.find((record) => record.id === selectedId)
      ?? records.find((record) => record.id === selectedId)
      ?? null,
    [filteredRecords, records, selectedId],
  )

  useEffect(() => {
    const recordId = selectedRecord?.id ?? ''
    const nextDraft = joinListInput(selectedRecord?.standardTags ?? [])
    const isDifferentRecord = standardTagsDraftRecordIdRef.current !== recordId
    const draftMatchesPreviousTags = standardTagsDraft === standardTagsCanonicalDraftRef.current

    standardTagsDraftRecordIdRef.current = recordId
    standardTagsCanonicalDraftRef.current = nextDraft

    if (isDifferentRecord || draftMatchesPreviousTags) {
      setStandardTagsDraft(nextDraft)
    }
  }, [selectedRecord?.id, selectedRecord?.standardTags, standardTagsDraft])

  useEffect(() => {
    const recordId = selectedRecord?.id ?? ''
    const nextDraft = joinListInput(selectedRecord?.specialties ?? [])
    const isDifferentRecord = specialtiesDraftRecordIdRef.current !== recordId
    const draftMatchesPrevious = specialtiesDraft === specialtiesCanonicalDraftRef.current

    specialtiesDraftRecordIdRef.current = recordId
    specialtiesCanonicalDraftRef.current = nextDraft

    if (isDifferentRecord || draftMatchesPrevious) {
      setSpecialtiesDraft(nextDraft)
    }
  }, [selectedRecord?.id, selectedRecord?.specialties, specialtiesDraft])

  useEffect(() => {
    const recordId = selectedRecord?.id ?? ''
    const nextDraft = joinListInput(selectedRecord?.achievements ?? [])
    const isDifferentRecord = achievementsDraftRecordIdRef.current !== recordId
    const draftMatchesPrevious = achievementsDraft === achievementsCanonicalDraftRef.current

    achievementsDraftRecordIdRef.current = recordId
    achievementsCanonicalDraftRef.current = nextDraft

    if (isDifferentRecord || draftMatchesPrevious) {
      setAchievementsDraft(nextDraft)
    }
  }, [selectedRecord?.id, selectedRecord?.achievements, achievementsDraft])

  useEffect(() => {
    const recordId = selectedRecord?.id ?? ''
    const nextDraft = joinListInput(selectedRecord?.publications ?? [])
    const isDifferentRecord = publicationsDraftRecordIdRef.current !== recordId
    const draftMatchesPrevious = publicationsDraft === publicationsCanonicalDraftRef.current

    publicationsDraftRecordIdRef.current = recordId
    publicationsCanonicalDraftRef.current = nextDraft

    if (isDifferentRecord || draftMatchesPrevious) {
      setPublicationsDraft(nextDraft)
    }
  }, [selectedRecord?.id, selectedRecord?.publications, publicationsDraft])

  useEffect(() => {
    if (filteredRecords.length === 0) {
      return
    }

    const selectedStillVisible = filteredRecords.some((record) => record.id === selectedId)
    if (!selectedStillVisible) {
      setSelectedId(filteredRecords[0].id)
    }
  }, [filteredRecords, selectedId])

  function updateSelectedRecord(updater: (record: ProfessorRecord) => ProfessorRecord) {
    setRecords((current) => current.map((record) => (record.id === selectedId ? updater(record) : record)))
    setSaveState('idle')
  }

  useEffect(() => {
    if (!shouldRevealEditorRef.current || !selectedId) return
    shouldRevealEditorRef.current = false
    window.setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, 0)
  }, [selectedId])

  function handleAddProfessor() {
    const nextRecord = createBlankProfessor()
    shouldRevealEditorRef.current = true
    setSearch('')
    setRecords((current) => [nextRecord, ...current])
    setSelectedId(nextRecord.id)
    setSaveState('idle')
    setErrorMessage('')
  }

  function handleAddProfessorToSameSchool() {
    const nextRecord = createBlankProfessor(selectedRecord ?? undefined)
    shouldRevealEditorRef.current = true
    setSearch('')
    setRecords((current) => [nextRecord, ...current])
    setSelectedId(nextRecord.id)
    setSaveState('idle')
    setErrorMessage('')
  }

  function handleBatchImport() {
    const { errors, nextRecords } = parseBatchTeacherLines(batchImport)
    if (errors.length > 0 || nextRecords.length === 0) {
      setSaveState('error')
      setErrorMessage(errors[0] ?? '请先填写要批量导入的老师。')
      return
    }

    setRecords((current) => [...nextRecords, ...current])
    shouldRevealEditorRef.current = true
    setSearch('')
    setSelectedId(nextRecords[0].id)
    setBatchImport(createInitialBatchImportState())
    setShowBatchImport(false)
    setSaveState('idle')
    setErrorMessage('')
  }

  function handleDeleteProfessor() {
    if (!selectedRecord) return
    const confirmed = window.confirm(`确认删除老师“${selectedRecord.name || '未命名老师'}”吗？`)
    if (!confirmed) return

    setRecords((current) => {
      const next = current.filter((record) => record.id !== selectedRecord.id)
      setSelectedId(next[0]?.id ?? '')
      return next
    })
    setSaveState('idle')
  }

  async function handleSave() {
    const normalized = normalizeRecordsForSave(records)
    const hasInvalid = normalized.some((record) => !record.name || !record.university)
    if (hasInvalid) {
      setSaveState('error')
      setErrorMessage('每位老师至少需要填写姓名和学校。')
      return
    }

    setSaveState('saving')
    setErrorMessage('')
    try {
      const response = await fetch('/api/admin/professors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      })

      if (!response.ok) {
        throw new Error('save_failed')
      }

      const savedRecords = (await response.json()) as ProfessorRecord[]
      setRecords(savedRecords)
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1800)
    } catch {
      setSaveState('error')
      setErrorMessage('保存失败，请检查本地开发服务器和文件权限。')
    }
  }

  async function handleSaveHomepage() {
    const normalized = normalizeHomepageConfig(homepageConfig)
    setHomepageSaveState('saving')
    setHomepageErrorMessage('')

    try {
      const response = await fetch('/api/admin/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      })

      if (!response.ok) {
        throw new Error('save_failed')
      }

      setHomepageConfig(normalizeHomepageConfig(await response.json()))
      setHomepageSaveState('saved')
      window.setTimeout(() => setHomepageSaveState('idle'), 1800)
    } catch {
      setHomepageSaveState('error')
      setHomepageErrorMessage('保存首页配置失败，请检查本地开发服务器和文件权限。')
    }
  }

  async function handleSaveAcademies() {
    const mergedConfig = mergeAcademyConfigWithProfessorRecords(records, academyConfig)
    const normalized = normalizeAcademyConfig(mergedConfig)
    const hasInvalidUniversity = mergedConfig.universities.some((university) => !university.nameZh.trim() && !university.nameEn.trim())
    const hasInvalidAcademy = mergedConfig.universities.some((university) =>
      university.academies.some((academy) => !academy.label.trim() || !academy.url.trim()),
    )

    if (hasInvalidUniversity || hasInvalidAcademy) {
      setAcademySaveState('error')
      setAcademyErrorMessage('请补齐院校名称，以及每条学院官网的学院名称和链接。')
      return
    }

    setAcademySaveState('saving')
    setAcademyErrorMessage('')
    try {
      const response = await fetch('/api/admin/academies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      })

      if (!response.ok) throw new Error('save_failed')

      setAcademyConfig(normalizeAcademyConfig(await response.json()))
      setAcademySaveState('saved')
      window.setTimeout(() => setAcademySaveState('idle'), 1800)
    } catch {
      setAcademySaveState('error')
      setAcademyErrorMessage('保存学院官网目录失败，请检查链接格式、本地服务器和文件权限。')
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 md:px-6 md:py-8" style={{ background: 'linear-gradient(180deg, #efe6d7 0%, #f6f1e8 100%)' }}>
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-serif text-xs tracking-[0.18em]" style={{ color: '#8a7d6e' }}>
              LOCAL DATA ADMIN
            </p>
            <h1 className="font-title text-3xl" style={{ color: '#1e1810', letterSpacing: '0.04em' }}>
              学者数据维护后台
            </h1>
            <p className="mt-2 font-kai text-sm" style={{ color: '#6b5d4d' }}>
              这里改的是本地 JSON 主数据。保存后，前台页面会读取同一份数据。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/"
              className="rounded-full px-4 py-2 font-serif text-sm"
              style={{ color: '#5c4030', border: '1px solid rgba(92, 64, 48, 0.16)', backgroundColor: 'rgba(255,255,255,0.45)' }}
            >
              返回前台
            </a>
            <button
              onClick={handleAddProfessor}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm"
              style={{ color: '#5c4030', border: '1px solid rgba(92, 64, 48, 0.16)', backgroundColor: '#fff7ed' }}
            >
              <Plus size={16} />
              新增老师
            </button>
            <button
              onClick={handleAddProfessorToSameSchool}
              disabled={!selectedRecord}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: '#5c4030', border: '1px solid rgba(92, 64, 48, 0.16)', backgroundColor: 'rgba(255,255,255,0.75)' }}
            >
              <Plus size={16} />
              同校新增老师
            </button>
            <button
              onClick={() => setShowBatchImport((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm"
              style={{ color: '#5c4030', border: '1px solid rgba(92, 64, 48, 0.16)', backgroundColor: 'rgba(255,255,255,0.75)' }}
            >
              <Plus size={16} />
              批量新增学校与老师
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm"
              style={{ color: '#fffaf3', border: '1px solid rgba(92, 64, 48, 0.2)', backgroundColor: '#6f4a32' }}
            >
              <Save size={16} />
              {saveState === 'saving' ? '保存中...' : '保存全部修改'}
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-2xl px-4 py-3 font-kai text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.5)', border: '1px solid rgba(92,64,48,0.1)', color: saveState === 'error' ? '#9f2f22' : '#6b5d4d' }}>
          {saveState === 'error'
            ? errorMessage
            : saveState === 'saved'
              ? '保存成功。你现在刷新前台页面，就会看到最新老师数据。'
              : '建议流程：先改资料，再点“保存全部修改”，最后回前台刷新查看。'}
        </div>

        <HomepageContentEditor
          records={records}
          config={homepageConfig}
          saveState={homepageSaveState}
          errorMessage={homepageErrorMessage}
          onChange={(config) => {
            setHomepageConfig(config)
            setHomepageSaveState('idle')
            setHomepageErrorMessage('')
          }}
          onSave={handleSaveHomepage}
        />

        <AcademyWebsiteEditor
          config={mergeAcademyConfigWithProfessorRecords(records, academyConfig)}
          professorRecords={records}
          saveState={academySaveState}
          errorMessage={academyErrorMessage}
          onChange={(config) => {
            setAcademyConfig(config)
            setAcademySaveState('idle')
            setAcademyErrorMessage('')
          }}
          onSave={handleSaveAcademies}
        />

        {showBatchImport ? (
          <section
            className="mb-4 rounded-[24px] p-5 md:p-6"
            style={{ backgroundColor: 'rgba(255,255,255,0.62)', border: '1px solid rgba(92,64,48,0.1)' }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-title text-2xl" style={{ color: '#241810' }}>
                  批量新增学校与老师
                </h2>
                <p className="mt-1 font-kai text-sm" style={{ color: '#7b6b58' }}>
                  学校信息填一次，下面每行录一位老师，导入后再逐条补简介、链接等细节。
                </p>
              </div>
              <button
                onClick={handleBatchImport}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm"
                style={{ color: '#fffaf3', border: '1px solid rgba(92, 64, 48, 0.2)', backgroundColor: '#6f4a32' }}
              >
                <Plus size={16} />
                导入这一批
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SelectField
                label="地区"
                value={batchImport.regionId}
                options={regionOptions.map((region) => ({ value: region.id, label: region.name }))}
                onChange={(value) => setBatchImport((current) => {
                  const regionId = value as ProfessorRecord['regionId']
                  const university = combineUniversityName(current.schoolZh, current.schoolEn)
                  return {
                    ...current,
                    regionId,
                    country: normalizeCountryForRegion(regionId, current.country, university),
                  }
                })}
              />
              {shouldShowCountry(batchImport.regionId) ? (
                <SelectField
                  label="国家"
                  value={batchImport.country || getDefaultCountry(batchImport.regionId, combineUniversityName(batchImport.schoolZh, batchImport.schoolEn))}
                  options={getCountryOptions(batchImport.regionId).map((country) => ({ value: country, label: country }))}
                  onChange={(value) => setBatchImport((current) => ({ ...current, country: value }))}
                />
              ) : null}
              <Field
                label="学校中文"
                value={batchImport.schoolZh}
                onChange={(value) => setBatchImport((current) => ({ ...current, schoolZh: value }))}
              />
              <Field
                label="学校英文"
                value={batchImport.schoolEn}
                onChange={(value) => setBatchImport((current) => ({ ...current, schoolEn: value }))}
              />
            </div>

            <div className="mt-4">
              <TextAreaField
                label="老师列表"
                value={batchImport.teacherLines}
                hint="每行一位老师"
                placeholder={`格式：${batchLineExample}\n例如：吴梦晋 | Kure Motoyuki | 副教授 | 中国绘画史、宋元书画 | 中国绘画史、明清绘画`}
                rows={8}
                onChange={(value) => setBatchImport((current) => ({ ...current, teacherLines: value }))}
              />
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[360px,minmax(0,1fr)]">
          <section
            className="rounded-[24px] p-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.56)', border: '1px solid rgba(92,64,48,0.1)' }}
          >
            <div className="mb-3 flex items-center gap-2 rounded-full px-3 py-2" style={{ backgroundColor: 'rgba(246, 239, 228, 0.9)' }}>
              <Search size={16} style={{ color: '#8a7d6e' }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索老师、学校、地区、研究方向"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: '#3a2d22' }}
              />
            </div>
            <div className="mb-3 flex items-center justify-between font-kai text-sm" style={{ color: '#7b6b58' }}>
              <span>共 {records.length} 位老师</span>
              <span>筛出 {filteredRecords.length} 位</span>
            </div>
            {filteredRecords.length === 0 ? (
              <div
                className="flex min-h-[240px] items-center justify-center rounded-2xl px-4 text-center font-kai text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.52)', color: '#8a7d6e', border: '1px dashed rgba(92,64,48,0.12)' }}
              >
                没有找到匹配老师，换个关键词试试。
              </div>
            ) : (
              <div
                key={`${search.trim().toLowerCase()}__${filteredRecordIdsKey}`}
                className="max-h-[72vh] space-y-2 overflow-y-auto pr-1"
              >
                {filteredRecords.map((record) => {
                  const isActive = record.id === selectedId
                  const { nameZh, nameEn } = getUniversityNameParts(record.university)
                  return (
                    <button
                      key={record.id}
                      onClick={() => setSelectedId(record.id)}
                      className="w-full rounded-2xl px-4 py-3 text-left transition-all"
                      style={{
                        backgroundColor: isActive ? 'rgba(111, 74, 50, 0.10)' : 'rgba(255,255,255,0.7)',
                        border: isActive ? '1px solid rgba(111, 74, 50, 0.24)' : '1px solid rgba(92,64,48,0.08)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-title text-xl" style={{ color: '#241810' }}>
                            {record.name || '未命名老师'}
                          </p>
                          <p className="truncate font-serif text-xs" style={{ color: '#8a7d6e' }}>
                            {nameEn ? `${nameZh} · ${nameEn}` : nameZh || '未填写学校'}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-1 font-serif text-[11px]" style={{ backgroundColor: 'rgba(92,64,48,0.08)', color: '#6b5d4d' }}>
                          {record.regionName}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {record.profileLink && <span className="rounded-full px-2 py-1 text-[10px]" style={{ backgroundColor: 'rgba(122, 61, 15, 0.08)', color: '#7a3d0f' }}>主页</span>}
                        {record.country && <span className="rounded-full px-2 py-1 text-[10px]" style={{ backgroundColor: 'rgba(98, 120, 70, 0.10)', color: '#53673e' }}>{record.country}</span>}
                        {record.cnkiLink && <span className="rounded-full px-2 py-1 text-[10px]" style={{ backgroundColor: 'rgba(92, 64, 48, 0.08)', color: '#6b5d4d' }}>知网</span>}
                        {record.scholarLink && <span className="rounded-full px-2 py-1 text-[10px]" style={{ backgroundColor: 'rgba(80, 104, 138, 0.09)', color: '#37516f' }}>Scholar</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section
            ref={editorSectionRef}
            className="rounded-[24px] p-5 md:p-6"
            style={{ backgroundColor: 'rgba(255,255,255,0.62)', border: '1px solid rgba(92,64,48,0.1)' }}
          >
            {!selectedRecord ? (
              <div className="py-20 text-center font-kai text-sm" style={{ color: '#8a7d6e' }}>
                左侧选一位老师，或先新增老师。
              </div>
            ) : (
              <div className="space-y-5">
                {(() => {
                  const { nameZh: universityZh, nameEn: universityEn } = getUniversityNameParts(selectedRecord.university)
                  return (
                    <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-title text-3xl" style={{ color: '#241810' }}>
                      {selectedRecord.name || '未命名老师'}
                    </h2>
                    <p className="mt-1 font-serif text-sm" style={{ color: '#8a7d6e' }}>
                      {selectedRecord.id}
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteProfessor}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm"
                    style={{ color: '#9f2f22', border: '1px solid rgba(159, 47, 34, 0.16)', backgroundColor: 'rgba(255,245,243,0.95)' }}
                  >
                    <Trash2 size={16} />
                    删除老师
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="姓名" value={selectedRecord.name} onChange={(value) => updateSelectedRecord((record) => ({ ...record, name: value }))} />
                  <Field label="英文名" value={selectedRecord.nameEn} onChange={(value) => updateSelectedRecord((record) => ({ ...record, nameEn: value }))} />
                  <SelectField
                    label="地区"
                    value={selectedRecord.regionId}
                    options={regionOptions.map((region) => ({ value: region.id, label: region.name }))}
                    onChange={(value) => {
                      const region = regionOptions.find((option) => option.id === value) ?? regionOptions[0]
                      updateSelectedRecord((record) => ({
                        ...record,
                        regionId: region.id,
                        regionGlyph: region.glyph,
                        regionName: region.name,
                        regionNameEn: region.nameEn,
                        regionOrder: region.order,
                        country: normalizeCountryForRegion(region.id, record.country, record.university),
                      }))
                    }}
                  />
                  <SelectField
                    label="职称"
                    value={selectedRecord.title}
                    options={titleOptions.map((title) => ({ value: title.value, label: title.label }))}
                    onChange={(value) => updateSelectedRecord((record) => ({ ...record, title: value as ProfessorRecord['title'] }))}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {shouldShowCountry(selectedRecord.regionId) ? (
                    <SelectField
                      label="国家"
                      value={selectedRecord.country || getDefaultCountry(selectedRecord.regionId, selectedRecord.university)}
                      options={getCountryOptions(selectedRecord.regionId).map((country) => ({ value: country, label: country }))}
                      onChange={(value) => updateSelectedRecord((record) => ({ ...record, country: value }))}
                    />
                  ) : null}
                  <Field
                    label="学校中文"
                    value={universityZh}
                    onChange={(value) =>
                      updateSelectedRecord((record) => ({
                        ...record,
                        university: combineUniversityName(value, getUniversityNameParts(record.university).nameEn),
                      }))
                    }
                  />
                  <Field
                    label="学校英文"
                    value={universityEn}
                    onChange={(value) =>
                      updateSelectedRecord((record) => ({
                        ...record,
                        university: combineUniversityName(getUniversityNameParts(record.university).nameZh, value),
                      }))
                    }
                  />
                </div>

                <TextAreaField
                  label="标准标签"
                  value={standardTagsDraft}
                  hint="前台方向筛选只看这里。可在已有标签后继续手动输入，自定义标签之间用；隔开"
                  placeholder="例如：中国绘画史；视觉文化；地域美术史"
                  onChange={(value) => {
                    setStandardTagsDraft(value)
                    updateSelectedRecord((record) => ({ ...record, standardTags: splitListInput(value) }))
                  }}
                />

                <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: 'rgba(248, 243, 234, 0.9)', border: '1px solid rgba(92,64,48,0.1)' }}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-kai text-sm" style={{ color: '#6b5d4d' }}>
                      标准标签勾选
                    </span>
                    <span className="font-serif text-xs" style={{ color: '#9a8b79' }}>
                      当前已选 {(selectedRecord.standardTags ?? []).length} 个
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {standardTagOptions.map((tag) => {
                      const active = (selectedRecord.standardTags ?? []).includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            updateSelectedRecord((record) => {
                              const next = new Set(record.standardTags ?? [])
                              if (next.has(tag)) {
                                next.delete(tag)
                              } else {
                                next.add(tag)
                              }
                              const nextTags = Array.from(next)
                              setStandardTagsDraft(joinListInput(nextTags))
                              return { ...record, standardTags: nextTags }
                            })
                          }
                          className="rounded-full px-3 py-1.5 font-kai text-sm transition-all"
                          style={{
                            backgroundColor: active ? 'rgba(122, 61, 15, 0.12)' : 'rgba(255,255,255,0.78)',
                            color: active ? '#7a3d0f' : '#5c4030',
                            border: active ? '1px solid rgba(122, 61, 15, 0.22)' : '1px solid rgba(92,64,48,0.12)',
                          }}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <TextAreaField
                  label="研究方向"
                  value={specialtiesDraft}
                  hint="保留原始研究方向，用分号或换行分隔"
                  onChange={(value) => {
                    setSpecialtiesDraft(value)
                    updateSelectedRecord((record) => ({ ...record, specialties: splitListInput(value) }))
                  }}
                />

                <TextAreaField
                  label="简介"
                  value={selectedRecord.bio}
                  onChange={(value) => updateSelectedRecord((record) => ({ ...record, bio: value }))}
                />

                <TextAreaField
                  label="学术成就"
                  value={achievementsDraft}
                  hint="用分号或换行分隔"
                  onChange={(value) => {
                    setAchievementsDraft(value)
                    updateSelectedRecord((record) => ({ ...record, achievements: splitListInput(value) }))
                  }}
                />

                <TextAreaField
                  label="代表著作"
                  value={publicationsDraft}
                  hint="用分号或换行分隔"
                  onChange={(value) => {
                    setPublicationsDraft(value)
                    updateSelectedRecord((record) => ({ ...record, publications: splitListInput(value) }))
                  }}
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="profileLink" value={selectedRecord.profileLink ?? ''} onChange={(value) => updateSelectedRecord((record) => ({ ...record, profileLink: value }))} />
                  <Field label="cnkiLink" value={selectedRecord.cnkiLink ?? ''} onChange={(value) => updateSelectedRecord((record) => ({ ...record, cnkiLink: value }))} />
                  <Field label="scholarLink" value={selectedRecord.scholarLink ?? ''} onChange={(value) => updateSelectedRecord((record) => ({ ...record, scholarLink: value }))} />
                </div>
                    </>
                  )
                })()}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function HomepageContentEditor({
  records,
  config,
  saveState,
  errorMessage,
  onChange,
  onSave,
}: {
  records: ProfessorRecord[]
  config: HomepageContentConfig
  saveState: SaveState
  errorMessage: string
  onChange: (config: HomepageContentConfig) => void
  onSave: () => void
}) {
  const [recommendedDraft, setRecommendedDraft] = useState('')
  const [academyDraft, setAcademyDraft] = useState('')
  const [recentDraft, setRecentDraft] = useState<HomepageRecentDraft>(createHomepageRecentDraft)
  const [draftError, setDraftError] = useState('')
  const [recommendedRegionFilter, setRecommendedRegionFilter] = useState<AdminHomepageRegionFilter>('all')
  const [academyRegionFilter, setAcademyRegionFilter] = useState<AdminHomepageRegionFilter>('all')
  const [recentProfessorRegionFilter, setRecentProfessorRegionFilter] = useState<AdminHomepageRegionFilter>('all')

  const regionFilterOptions = useMemo(
    () => getAdminHomepageRegionOptions(records),
    [records],
  )
  const allPickerData = useMemo(() => buildAdminHomepagePickerData(records, 'all'), [records])
  const recommendedPickerData = useMemo(
    () => buildAdminHomepagePickerData(records, recommendedRegionFilter),
    [records, recommendedRegionFilter],
  )
  const academyPickerData = useMemo(
    () => buildAdminHomepagePickerData(records, academyRegionFilter),
    [academyRegionFilter, records],
  )
  const recentProfessorPickerData = useMemo(
    () => buildAdminHomepagePickerData(records, recentProfessorRegionFilter),
    [recentProfessorRegionFilter, records],
  )
  const professorByReference = useMemo(() => {
    const map = new Map<string, ProfessorRecord>()
    records.forEach((record) => {
      map.set(record.id, record)
      map.set(record.name, record)
    })
    return map
  }, [records])

  const missingRecommendedRefs = useMemo(
    () => new Set(getMissingHomepageProfessorRefs(records, config.recommendedProfessorRefs)),
    [config.recommendedProfessorRefs, records],
  )

  const universityOptions = allPickerData.universityOptions

  const universityLabelByReference = useMemo(
    () => new Map(universityOptions.map((option) => [option.value, option.label])),
    [universityOptions],
  )

  const selectedRecommended = recommendedPickerData.professorGroups
    .flatMap((group) => group.options)
    .some((option) => option.value === recommendedDraft)
    ? recommendedDraft
    : recommendedPickerData.professorGroups[0]?.options[0]?.value || ''
  const selectedAcademy = academyPickerData.universityOptions.some((option) => option.value === academyDraft)
    ? academyDraft
    : academyPickerData.universityOptions[0]?.value || ''
  const selectedRecentProfessor = recentProfessorPickerData.professorGroups
    .flatMap((group) => group.options)
    .some((option) => option.value === recentDraft.professorRef)
    ? recentDraft.professorRef
    : recentProfessorPickerData.professorGroups[0]?.options[0]?.value || ''

  function updateConfig(patch: Partial<HomepageContentConfig>) {
    onChange({ ...config, ...patch })
  }

  function handleAddRecommended() {
    if (!selectedRecommended || config.recommendedProfessorRefs.includes(selectedRecommended)) return
    updateConfig({ recommendedProfessorRefs: [...config.recommendedProfessorRefs, selectedRecommended] })
  }

  function handleAddAcademy() {
    if (!selectedAcademy || config.academyUniversityRefs.includes(selectedAcademy)) return
    updateConfig({ academyUniversityRefs: [...config.academyUniversityRefs, selectedAcademy] })
  }

  function handleAddRecentEntry() {
    const associatedProfessorRef = selectedRecentProfessor
    const associatedProfessor = professorByReference.get(associatedProfessorRef)
    const title = recentDraft.title.trim()
      || (recentDraft.kind === 'professor' && associatedProfessor ? `新增学者 · ${associatedProfessor.name}` : '')
    const detail = recentDraft.detail.trim()
      || (associatedProfessor ? getUniversityNameParts(associatedProfessor.university).nameZh : '')
    const timestamp = Date.parse(`${recentDraft.recordedAt}T12:00:00.000Z`)

    if (!title || !Number.isFinite(timestamp)) {
      setDraftError('请填写近期收录标题和有效日期。')
      return
    }

    const entry: HomepageRecentEntry = {
      id: createHomepageRecentEntryId(),
      kind: recentDraft.kind,
      title,
      detail,
      recordedAt: new Date(timestamp).toISOString(),
      ...(recentDraft.kind === 'professor' && associatedProfessorRef ? { professorRef: associatedProfessorRef } : {}),
    }

    updateConfig({ recentEntries: [entry, ...config.recentEntries] })
    setRecentDraft(createHomepageRecentDraft())
    setDraftError('')
  }

  return (
    <section
      className="mb-4 rounded-[24px] p-5 md:p-6"
      style={{ backgroundColor: 'rgba(255,255,255,0.66)', border: '1px solid rgba(92,64,48,0.1)' }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-serif text-xs tracking-[0.16em]" style={{ color: '#8a7d6e' }}>
            HOMEPAGE CONTENT
          </p>
          <h2 className="font-title text-2xl" style={{ color: '#241810' }}>
            首页内容配置
          </h2>
          <p className="mt-1 font-kai text-sm" style={{ color: '#7b6b58' }}>
            维护首页的推荐学者、院校导览和近期收录。推荐学者只有在完全留空时才会使用默认名单。
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm"
          style={{ color: '#fffaf3', border: '1px solid rgba(92,64,48,0.2)', backgroundColor: '#687756' }}
        >
          <Save size={16} />
          {saveState === 'saving' ? '保存中...' : '保存首页配置'}
        </button>
      </div>

      <div className="mb-4 rounded-2xl px-4 py-3 font-kai text-sm" style={{ backgroundColor: 'rgba(246,239,228,0.74)', color: saveState === 'error' ? '#9f2f22' : '#776856' }}>
        {saveState === 'error'
          ? errorMessage
          : saveState === 'saved'
            ? '首页配置已保存。刷新前台即可查看新的首页编排。'
            : '首页只展示各列表最前面的槽位内容；可以多放候选项，再用上下箭头调整优先级。'}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <HomepageListEditor
          icon={<CalendarPlus size={17} />}
          title="推荐学者"
          description="选择希望优先展示在首页推荐横滑中的老师；首页最多展示前 8 位。"
          displayLimit={HOMEPAGE_SECTION_LIMITS.recommendedProfessors}
          displayUnit="位"
          regionFilter={recommendedRegionFilter}
          regionOptions={regionFilterOptions}
          onRegionFilterChange={(value) => {
            setRecommendedRegionFilter(value)
            setRecommendedDraft('')
          }}
          optionGroups={recommendedPickerData.professorGroups}
          selectedValue={selectedRecommended}
          onSelectedValueChange={setRecommendedDraft}
          items={config.recommendedProfessorRefs}
          getItemLabel={(reference) => professorByReference.get(reference)?.name || reference}
          getItemWarning={(reference) => missingRecommendedRefs.has(reference) ? '未找到老师，该项不会显示在首页' : ''}
          onAdd={handleAddRecommended}
          onMove={(index, offset) => updateConfig({ recommendedProfessorRefs: moveListItem(config.recommendedProfessorRefs, index, offset) })}
          onRemove={(index) => updateConfig({ recommendedProfessorRefs: config.recommendedProfessorRefs.filter((_, itemIndex) => itemIndex !== index) })}
        />

        <HomepageListEditor
          icon={<Building2 size={17} />}
          title="院校导览"
          description="选择首页院校入口；完整学院官网仍在院校导航页查看。"
          displayLimit={HOMEPAGE_SECTION_LIMITS.academyUniversities}
          displayUnit="所"
          regionFilter={academyRegionFilter}
          regionOptions={regionFilterOptions}
          onRegionFilterChange={(value) => {
            setAcademyRegionFilter(value)
            setAcademyDraft('')
          }}
          options={academyPickerData.universityOptions}
          selectedValue={selectedAcademy}
          onSelectedValueChange={setAcademyDraft}
          items={config.academyUniversityRefs}
          getItemLabel={(reference) => universityLabelByReference.get(reference) || reference}
          onAdd={handleAddAcademy}
          onMove={(index, offset) => updateConfig({ academyUniversityRefs: moveListItem(config.academyUniversityRefs, index, offset) })}
          onRemove={(index) => updateConfig({ academyUniversityRefs: config.academyUniversityRefs.filter((_, itemIndex) => itemIndex !== index) })}
        />
      </div>

      <div className="mt-4 rounded-[20px] p-4" style={{ backgroundColor: 'rgba(248,243,234,0.82)', border: '1px solid rgba(92,64,48,0.08)' }}>
        <div className="mb-3 flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ color: '#a54a39', backgroundColor: 'rgba(176,53,40,0.08)' }}>
            <Link2 size={17} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-title text-xl" style={{ color: '#34271c' }}>近期收录</h3>
              <span className="rounded-full px-2 py-1 font-kai text-[11px]" style={{ color: '#856f59', backgroundColor: 'rgba(255,255,255,0.68)', border: '1px solid rgba(92,64,48,0.08)' }}>
                首页展示前 {HOMEPAGE_SECTION_LIMITS.recentEntries} 条 · 已配置 {config.recentEntries.length} 条
              </span>
            </div>
            <p className="mt-1 font-kai text-xs" style={{ color: '#8a7d6e' }}>
              可以补充老师、院校或官网更新。没有手动项目时，首页会自动展示最近新增老师。
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SelectField
            label="类型"
            value={recentDraft.kind}
            options={homepageRecentKindOptions.map((option) => ({ ...option }))}
            onChange={(value) => setRecentDraft((current) => ({ ...current, kind: value as HomepageRecentEntryKind }))}
          />
          <Field
            label="标题"
            value={recentDraft.title}
            placeholder="留空可自动生成学者标题"
            onChange={(value) => setRecentDraft((current) => ({ ...current, title: value }))}
          />
          <Field
            label="补充说明"
            value={recentDraft.detail}
            placeholder="例如：华东师范大学"
            onChange={(value) => setRecentDraft((current) => ({ ...current, detail: value }))}
          />
          <Field
            label="日期"
            value={recentDraft.recordedAt}
            type="date"
            onChange={(value) => setRecentDraft((current) => ({ ...current, recordedAt: value }))}
          />
          <SelectField
            label="老师地区"
            value={recentProfessorRegionFilter}
            options={regionFilterOptions}
            onChange={(value) => {
              setRecentProfessorRegionFilter(value as AdminHomepageRegionFilter)
              setRecentDraft((current) => ({ ...current, professorRef: '' }))
            }}
          />
          <GroupedSelectField
            label="关联老师"
            value={selectedRecentProfessor}
            optionGroups={recentProfessorPickerData.professorGroups}
            onChange={(value) => setRecentDraft((current) => ({ ...current, professorRef: value }))}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="font-kai text-xs" style={{ color: draftError ? '#9f2f22' : '#9a8b79' }}>
            {draftError || '关联老师后，首页近期收录可以直接打开老师名片。'}
          </span>
          <button
            type="button"
            onClick={handleAddRecentEntry}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm"
            style={{ color: '#5c4030', border: '1px solid rgba(92,64,48,0.14)', backgroundColor: 'rgba(255,255,255,0.84)' }}
          >
            <Plus size={15} />
            添加近期收录
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {config.recentEntries.length > 0 ? config.recentEntries.map((entry, index) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.72)', border: '1px solid rgba(92,64,48,0.08)' }}>
              <span className="min-w-0 flex-1">
                <strong className="block truncate font-kai text-sm font-normal" style={{ color: '#5c4030' }}>{entry.title}</strong>
                <span className="mt-0.5 block truncate font-serif text-xs" style={{ color: '#9a8b79' }}>
                  {entry.detail || '无补充说明'} · {new Date(entry.recordedAt).toLocaleDateString('zh-CN')}
                </span>
              </span>
              <AdminOrderButtons
                index={index}
                itemCount={config.recentEntries.length}
                onMove={(offset) => updateConfig({ recentEntries: moveListItem(config.recentEntries, index, offset) })}
                onRemove={() => updateConfig({ recentEntries: config.recentEntries.filter((_, itemIndex) => itemIndex !== index) })}
              />
            </div>
          )) : (
            <p className="rounded-2xl px-3 py-3 font-kai text-xs" style={{ color: '#9a8b79', backgroundColor: 'rgba(255,255,255,0.5)' }}>
              暂未手动编排，前台会自动显示最近新增老师。
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function AcademyWebsiteEditor({
  config,
  professorRecords,
  saveState,
  errorMessage,
  onChange,
  onSave,
}: {
  config: AcademyConfig
  professorRecords: ProfessorRecord[]
  saveState: SaveState
  errorMessage: string
  onChange: (config: AcademyConfig) => void
  onSave: () => void
}) {
  const [selectedId, setSelectedId] = useState(config.universities[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<AdminHomepageRegionFilter>('all')
  const selectedUniversity = config.universities.find((university) => university.id === selectedId)
    ?? config.universities[0]
    ?? null
  const professorUniversityNames = useMemo(
    () => new Set(professorRecords.map((record) => {
      const { nameZh, nameEn } = getUniversityNameParts(record.university)
      return nameZh || nameEn
    })),
    [professorRecords],
  )
  const selectedUniversityName = selectedUniversity?.nameZh || selectedUniversity?.nameEn || ''
  const isIndependentUniversity = selectedUniversity ? !professorUniversityNames.has(selectedUniversityName) : false
  const filteredUniversities = config.universities.filter((university) => {
    const query = search.trim().toLocaleLowerCase('zh-CN')
    const matchesRegion = regionFilter === 'all' || university.regionId === regionFilter
    return matchesRegion && (!query || [university.nameZh, university.nameEn, university.country]
      .join(' ')
      .toLocaleLowerCase('zh-CN')
      .includes(query))
  })
  const groupedUniversities = regionOptions
    .map((region) => ({
      ...region,
      universities: filteredUniversities.filter((university) => university.regionId === region.id),
    }))
    .filter((region) => region.universities.length > 0)

  function handleRegionFilterChange(value: AdminHomepageRegionFilter) {
    setRegionFilter(value)
    if (value === 'all') return

    const firstMatch = config.universities.find((university) => university.regionId === value)
    if (firstMatch) setSelectedId(firstMatch.id)
  }

  function updateUniversity(updater: (university: AcademyUniversityConfig) => AcademyUniversityConfig) {
    if (!selectedUniversity) return
    onChange({
      universities: config.universities.map((university) =>
        university.id === selectedUniversity.id ? updater(university) : university,
      ),
    })
  }

  function handleAddUniversity() {
    const university = createBlankAcademyUniversity()
    onChange({ universities: [university, ...config.universities] })
    setSelectedId(university.id)
    setSearch('')
  }

  function handleDeleteUniversity() {
    if (!selectedUniversity) return
    const confirmed = window.confirm(`确认删除院校“${selectedUniversity.nameZh || selectedUniversity.nameEn || '未命名院校'}”及其学院官网吗？`)
    if (!confirmed) return

    const nextUniversities = config.universities.filter((university) => university.id !== selectedUniversity.id)
    onChange({ universities: nextUniversities })
    setSelectedId(nextUniversities[0]?.id ?? '')
  }

  function handleAddAcademy() {
    updateUniversity((university) => ({
      ...university,
      academies: [
        ...university.academies,
        { id: createAcademyWebsiteId(), label: '', url: '' },
      ],
    }))
  }

  return (
    <section
      className="mb-4 rounded-[24px] p-5 md:p-6"
      style={{ backgroundColor: 'rgba(255,255,255,0.66)', border: '1px solid rgba(92,64,48,0.1)' }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-serif text-xs tracking-[0.16em]" style={{ color: '#8a7d6e' }}>
            ACADEMY WEBSITE DIRECTORY
          </p>
          <h2 className="font-title text-2xl" style={{ color: '#241810' }}>
            学院官网目录
          </h2>
          <p className="mt-1 font-kai text-sm" style={{ color: '#7b6b58' }}>
            选择已有院校后，只需维护学院名称和官网链接；也可以先录入暂时没有老师的新院校。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAddUniversity}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm"
            style={{ color: '#5c4030', border: '1px solid rgba(92,64,48,0.14)', backgroundColor: 'rgba(255,255,255,0.84)' }}
          >
            <Plus size={16} />
            新增独立院校
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-serif text-sm"
            style={{ color: '#fffaf3', border: '1px solid rgba(92,64,48,0.2)', backgroundColor: '#687756' }}
          >
            <Save size={16} />
            {saveState === 'saving' ? '保存中...' : '保存学院官网'}
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-2xl px-4 py-3 font-kai text-sm" style={{ backgroundColor: 'rgba(246,239,228,0.74)', color: saveState === 'error' ? '#9f2f22' : '#776856' }}>
        {saveState === 'error'
          ? errorMessage
          : saveState === 'saved'
            ? '学院官网目录已保存。刷新前台院校导航即可查看。'
            : `当前可维护 ${config.universities.length} 所院校。左侧可按地区分类，每所院校可以添加多条学院或系所官网。`}
      </div>

      <div className="grid gap-4 lg:grid-cols-[310px,minmax(0,1fr)]">
        <div className="rounded-[20px] p-3" style={{ backgroundColor: 'rgba(248,243,234,0.82)', border: '1px solid rgba(92,64,48,0.08)' }}>
          <label className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.78)', border: '1px solid rgba(92,64,48,0.08)' }}>
            <Search size={15} style={{ color: '#8a7d6e' }} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索院校"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#3a2d22' }}
            />
          </label>
          <div className="scrollbar-hide mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {[{ id: 'all', name: '全部' }, ...regionOptions].map((region) => {
              const active = region.id === regionFilter
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => handleRegionFilterChange(region.id as AdminHomepageRegionFilter)}
                  className="shrink-0 rounded-full px-2.5 py-1.5 font-kai text-xs"
                  style={{
                    color: active ? '#fffdf7' : '#756350',
                    backgroundColor: active ? '#687756' : 'rgba(255,255,255,0.68)',
                    border: active ? '1px solid rgba(77,92,61,0.42)' : '1px solid rgba(92,64,48,0.08)',
                  }}
                >
                  {region.name.replace('地区', '')}
                </button>
              )
            })}
          </div>
          <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {groupedUniversities.map((region) => (
              <div key={region.id}>
                <p className="mb-1 mt-3 px-1 font-kai text-[11px]" style={{ color: '#9a8b79' }}>
                  {region.name}
                </p>
                <div className="space-y-2">
                  {region.universities.map((university) => {
                    const active = university.id === selectedUniversity?.id
                    return (
                      <button
                        key={university.id}
                        type="button"
                        onClick={() => setSelectedId(university.id)}
                        className="w-full rounded-2xl px-3 py-2.5 text-left transition-colors"
                        style={{
                          color: active ? '#5c4030' : '#756350',
                          backgroundColor: active ? 'rgba(111,74,50,0.10)' : 'rgba(255,255,255,0.62)',
                          border: active ? '1px solid rgba(111,74,50,0.22)' : '1px solid rgba(92,64,48,0.06)',
                        }}
                      >
                        <span className="block truncate font-kai text-sm">{university.nameZh || university.nameEn || '未命名院校'}</span>
                        <span className="mt-1 block truncate font-serif text-[11px]" style={{ color: '#9a8b79' }}>
                          {university.academies.length} 条学院官网
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] p-4" style={{ backgroundColor: 'rgba(248,243,234,0.82)', border: '1px solid rgba(92,64,48,0.08)' }}>
          {!selectedUniversity ? (
            <p className="py-16 text-center font-kai text-sm" style={{ color: '#9a8b79' }}>
              请先新增一所院校。
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-title text-xl" style={{ color: '#34271c' }}>
                    {selectedUniversity.nameZh || selectedUniversity.nameEn || '未命名院校'}
                  </h3>
                  <p className="mt-1 font-serif text-xs" style={{ color: '#9a8b79' }}>
                    {isIndependentUniversity ? '独立院校，可编辑院校资料' : '已有老师院校，只需维护下方学院官网'}
                  </p>
                </div>
                {isIndependentUniversity ? (
                  <button
                    type="button"
                    onClick={handleDeleteUniversity}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-2 font-serif text-sm"
                    style={{ color: '#a54a39', backgroundColor: 'rgba(255,245,243,0.8)', border: '1px solid rgba(159,47,34,0.14)' }}
                  >
                    <Trash2 size={15} />
                    删除院校
                  </button>
                ) : null}
              </div>

              {isIndependentUniversity ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="院校中文名" value={selectedUniversity.nameZh} onChange={(value) => updateUniversity((university) => ({ ...university, nameZh: value }))} />
                  <Field label="院校英文名" value={selectedUniversity.nameEn} onChange={(value) => updateUniversity((university) => ({ ...university, nameEn: value }))} />
                  <SelectField
                    label="所属地区"
                    value={selectedUniversity.regionId}
                    options={regionOptions.map((region) => ({ value: region.id, label: region.name }))}
                    onChange={(value) => updateUniversity((university) => ({ ...university, regionId: value as ProfessorRecord['regionId'] }))}
                  />
                  <Field label="国家或地区" value={selectedUniversity.country} onChange={(value) => updateUniversity((university) => ({ ...university, country: value }))} />
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-kai text-base" style={{ color: '#5c4030' }}>学院、系所或研究机构官网</h4>
                  <p className="mt-1 font-serif text-xs" style={{ color: '#9a8b79' }}>可添加多条，前台会按这里的顺序展示。</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAcademy}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 font-serif text-sm"
                  style={{ color: '#5c4030', border: '1px solid rgba(92,64,48,0.14)', backgroundColor: 'rgba(255,255,255,0.84)' }}
                >
                  <Plus size={15} />
                  新增学院官网
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {selectedUniversity.academies.length > 0 ? selectedUniversity.academies.map((academy, index) => (
                  <div key={academy.id} className="grid gap-2 rounded-2xl p-3 md:grid-cols-[minmax(0,0.8fr),minmax(0,1.2fr),auto]" style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(92,64,48,0.08)' }}>
                    <input
                      value={academy.label}
                      onChange={(event) => updateUniversity((university) => ({
                        ...university,
                        academies: university.academies.map((item) => item.id === academy.id ? { ...item, label: event.target.value } : item),
                      }))}
                      placeholder="学院或系所名称"
                      className="min-w-0 rounded-xl px-3 py-2 text-sm outline-none"
                      style={{ color: '#3a2d22', backgroundColor: 'rgba(255,255,255,0.88)', border: '1px solid rgba(92,64,48,0.1)' }}
                    />
                    <input
                      type="url"
                      value={academy.url}
                      onChange={(event) => updateUniversity((university) => ({
                        ...university,
                        academies: university.academies.map((item) => item.id === academy.id ? { ...item, url: event.target.value } : item),
                      }))}
                      placeholder="https://..."
                      className="min-w-0 rounded-xl px-3 py-2 text-sm outline-none"
                      style={{ color: '#3a2d22', backgroundColor: 'rgba(255,255,255,0.88)', border: '1px solid rgba(92,64,48,0.1)' }}
                    />
                    <AdminOrderButtons
                      index={index}
                      itemCount={selectedUniversity.academies.length}
                      onMove={(offset) => updateUniversity((university) => ({ ...university, academies: moveListItem(university.academies, index, offset) }))}
                      onRemove={() => updateUniversity((university) => ({ ...university, academies: university.academies.filter((item) => item.id !== academy.id) }))}
                    />
                  </div>
                )) : (
                  <p className="rounded-2xl px-3 py-4 font-kai text-sm" style={{ color: '#9a8b79', backgroundColor: 'rgba(255,255,255,0.5)' }}>
                    暂无学院官网，前台会显示“学院官网待补充”。
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function HomepageListEditor({
  icon,
  title,
  description,
  displayLimit,
  displayUnit,
  options,
  optionGroups,
  regionFilter,
  regionOptions,
  onRegionFilterChange,
  selectedValue,
  items,
  getItemLabel,
  getItemWarning,
  onSelectedValueChange,
  onAdd,
  onMove,
  onRemove,
}: {
  icon: React.ReactNode
  title: string
  description: string
  displayLimit: number
  displayUnit: string
  options?: AdminHomepagePickerOption[]
  optionGroups?: AdminHomepageProfessorGroup[]
  regionFilter: AdminHomepageRegionFilter
  regionOptions: AdminHomepagePickerOption[]
  onRegionFilterChange: (value: AdminHomepageRegionFilter) => void
  selectedValue: string
  items: string[]
  getItemLabel: (value: string) => string
  getItemWarning?: (value: string) => string
  onSelectedValueChange: (value: string) => void
  onAdd: () => void
  onMove: (index: number, offset: -1 | 1) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="rounded-[20px] p-4" style={{ backgroundColor: 'rgba(248,243,234,0.82)', border: '1px solid rgba(92,64,48,0.08)' }}>
      <div className="mb-3 flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ color: '#687756', backgroundColor: 'rgba(102,118,83,0.1)' }}>
          {icon}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-title text-xl" style={{ color: '#34271c' }}>{title}</h3>
            <span className="rounded-full px-2 py-1 font-kai text-[11px]" style={{ color: '#856f59', backgroundColor: 'rgba(255,255,255,0.68)', border: '1px solid rgba(92,64,48,0.08)' }}>
              首页展示前 {displayLimit} {displayUnit} · 已配置 {items.length} {displayUnit}
            </span>
          </div>
          <p className="mt-1 font-kai text-xs" style={{ color: '#8a7d6e' }}>{description}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[138px,minmax(0,1fr),auto]">
        <select
          aria-label={`${title}地区`}
          value={regionFilter}
          onChange={(event) => onRegionFilterChange(event.target.value as AdminHomepageRegionFilter)}
          className="min-w-0 rounded-2xl px-3 py-2.5 text-sm outline-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(92,64,48,0.12)', color: '#241810' }}
        >
          {regionOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {optionGroups ? (
          <GroupedSelect
            ariaLabel={`${title}选项`}
            value={selectedValue}
            optionGroups={optionGroups}
            onChange={onSelectedValueChange}
          />
        ) : (
          <select
            aria-label={`${title}选项`}
            value={selectedValue}
            onChange={(event) => onSelectedValueChange(event.target.value)}
            className="min-w-0 rounded-2xl px-3 py-2.5 text-sm outline-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(92,64,48,0.12)', color: '#241810' }}
          >
            {(options ?? []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 font-serif text-sm"
          style={{ color: '#5c4030', border: '1px solid rgba(92,64,48,0.14)', backgroundColor: 'rgba(255,255,255,0.84)' }}
        >
          <Plus size={15} />
          添加
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {items.length > 0 ? items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.72)', border: '1px solid rgba(92,64,48,0.08)' }}>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-kai text-sm" style={{ color: '#5c4030' }}>{getItemLabel(item)}</span>
              {getItemWarning?.(item) ? (
                <span className="mt-0.5 block truncate font-kai text-[11px]" style={{ color: '#a54a39' }}>
                  {getItemWarning(item)}
                </span>
              ) : null}
            </span>
            <AdminOrderButtons
              index={index}
              itemCount={items.length}
              onMove={(offset) => onMove(index, offset)}
              onRemove={() => onRemove(index)}
            />
          </div>
        )) : (
          <p className="rounded-2xl px-3 py-3 font-kai text-xs" style={{ color: '#9a8b79', backgroundColor: 'rgba(255,255,255,0.5)' }}>
            暂未手动编排，前台会自动补足内容。
          </p>
        )}
      </div>
    </div>
  )
}

function GroupedSelect({
  ariaLabel,
  value,
  optionGroups,
  onChange,
}: {
  ariaLabel: string
  value: string
  optionGroups: AdminHomepageProfessorGroup[]
  onChange: (value: string) => void
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-0 rounded-2xl px-3 py-2.5 text-sm outline-none"
      style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(92,64,48,0.12)', color: '#241810' }}
    >
      {optionGroups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

function GroupedSelectField({
  label,
  value,
  optionGroups,
  onChange,
}: {
  label: string
  value: string
  optionGroups: AdminHomepageProfessorGroup[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-kai text-sm" style={{ color: '#6b5d4d' }}>
        {label}
      </span>
      <GroupedSelect ariaLabel={label} value={value} optionGroups={optionGroups} onChange={onChange} />
    </label>
  )
}

function AdminOrderButtons({
  index,
  itemCount,
  onMove,
  onRemove,
}: {
  index: number
  itemCount: number
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button type="button" aria-label="上移" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-full p-1.5 disabled:opacity-30" style={{ color: '#7b6b58' }}>
        <ArrowUp size={14} />
      </button>
      <button type="button" aria-label="下移" disabled={index === itemCount - 1} onClick={() => onMove(1)} className="rounded-full p-1.5 disabled:opacity-30" style={{ color: '#7b6b58' }}>
        <ArrowDown size={14} />
      </button>
      <button type="button" aria-label="移除" onClick={onRemove} className="rounded-full p-1.5" style={{ color: '#a54a39' }}>
        <Trash2 size={14} />
      </button>
    </span>
  )
}

function Field({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  type?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-kai text-sm" style={{ color: '#6b5d4d' }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(92,64,48,0.12)', color: '#241810' }}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-kai text-sm" style={{ color: '#6b5d4d' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(92,64,48,0.12)', color: '#241810' }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextAreaField({
  label,
  value,
  hint,
  placeholder,
  rows = 4,
  onChange,
}: {
  label: string
  value: string
  hint?: string
  placeholder?: string
  rows?: number
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-kai text-sm" style={{ color: '#6b5d4d' }}>
          {label}
        </span>
        {hint ? (
          <span className="font-serif text-xs" style={{ color: '#9a8b79' }}>
            {hint}
          </span>
        ) : null}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(92,64,48,0.12)', color: '#241810', resize: 'vertical' }}
      />
    </label>
  )
}
