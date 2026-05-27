import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Save, Search, Trash2 } from 'lucide-react'
import type { ProfessorRecord } from '@/types'
import { getUniversityDisplayName, getUniversityNameParts } from '@/lib/universityNames'
import {
  getCountryOptions,
  getDefaultCountry,
  normalizeCountryForRegion,
  shouldShowCountry,
} from '@/lib/adminCountry'
import { standardTagOptions } from '@/lib/standardTags'

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

type BatchImportState = {
  regionId: ProfessorRecord['regionId']
  country: string
  schoolZh: string
  schoolEn: string
  teacherLines: string
}

const batchLineExample = '姓名 | 英文名 | 职称 | 标准标签(、分隔) | 研究方向(、分隔)'

function createLocalProfessorId() {
  return `prof-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-kai text-sm" style={{ color: '#6b5d4d' }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
