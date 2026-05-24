import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Search, Trash2 } from 'lucide-react'
import type { ProfessorRecord } from '@/types'
import { getCanonicalUniversityKey, getUniversityDisplayName, getUniversityNameParts } from '@/lib/universityNames'
import { standardTagOptions } from '@/lib/standardTags'

const regionOptions = [
  { id: 'huabei', glyph: '北', name: '华北地区', nameEn: 'North China', order: 0 },
  { id: 'huadong', glyph: '东', name: '华东地区', nameEn: 'East China', order: 1 },
  { id: 'huanan', glyph: '南', name: '华南地区', nameEn: 'South China', order: 2 },
  { id: 'zhongxibu', glyph: '中', name: '中西部地区', nameEn: 'Central & West China', order: 3 },
  { id: 'gangtai', glyph: '港', name: '港台地区', nameEn: 'Hong Kong & Taiwan', order: 4 },
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

function createBlankProfessor(base?: Partial<ProfessorRecord>): ProfessorRecord {
  const defaultRegion = regionOptions[0]
  return {
    id: `prof-${Date.now()}`,
    name: '',
    nameEn: '',
    title: 'professor',
    university: base?.university ?? '',
    specialties: [],
    standardTags: [],
    bio: '',
    achievements: [],
    publications: [],
    profileLink: '',
    cnkiLink: '',
    scholarLink: '',
    regionId: base?.regionId ?? defaultRegion.id,
    regionGlyph: base?.regionGlyph ?? defaultRegion.glyph,
    regionName: base?.regionName ?? defaultRegion.name,
    regionNameEn: base?.regionNameEn ?? defaultRegion.nameEn,
    regionOrder: base?.regionOrder ?? defaultRegion.order,
    universityOrder: 9999,
    professorOrder: 9999,
  }
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
  const zh = nameZh.trim()
  const en = nameEn.trim()
  if (zh && en) return `${zh} · ${en}`
  return zh || en
}

function normalizeRecordsForSave(records: ProfessorRecord[]) {
  const regionOrderMap = new Map(regionOptions.map((region) => [region.id, region]))
  const universityOrderMap = new Map<string, number>()
  const professorOrderMap = new Map<string, number>()

  return records.map((record) => {
    const region = regionOrderMap.get(record.regionId) ?? regionOptions[0]
    const normalizedUniversity = getUniversityDisplayName(record.university.trim())
    const universityKey = `${region.id}__${getCanonicalUniversityKey(normalizedUniversity)}`
    const universityOrder = universityOrderMap.get(universityKey) ?? universityOrderMap.size
    if (!universityOrderMap.has(universityKey)) universityOrderMap.set(universityKey, universityOrder)

    const professorKey = `${universityKey}__${record.id}`
    const professorOrder = professorOrderMap.get(professorKey) ?? professorOrderMap.size
    if (!professorOrderMap.has(professorKey)) professorOrderMap.set(professorKey, professorOrder)

    return {
      ...record,
      name: record.name.trim(),
      nameEn: record.nameEn.trim(),
      university: normalizedUniversity,
      bio: record.bio.trim(),
      profileLink: record.profileLink?.trim() || '',
      cnkiLink: record.cnkiLink?.trim() || '',
      scholarLink: record.scholarLink?.trim() || '',
      standardTags: (record.standardTags ?? []).filter(Boolean),
      regionGlyph: region.glyph,
      regionName: region.name,
      regionNameEn: region.nameEn,
      regionOrder: region.order,
      universityOrder,
      professorOrder,
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
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

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
      [record.name, record.nameEn, record.university, record.regionName, ...record.specialties]
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

  function handleAddProfessor() {
    const nextRecord = createBlankProfessor()
    setRecords((current) => [nextRecord, ...current])
    setSelectedId(nextRecord.id)
    setSaveState('idle')
  }

  function handleAddProfessorToSameSchool() {
    const nextRecord = createBlankProfessor(selectedRecord ?? undefined)
    setRecords((current) => [nextRecord, ...current])
    setSelectedId(nextRecord.id)
    setSaveState('idle')
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

                <div className="grid gap-4 md:grid-cols-2">
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
                  value={joinListInput(selectedRecord.standardTags ?? [])}
                  hint="建议从下方勾选，最多 2 到 3 个"
                  onChange={(value) => updateSelectedRecord((record) => ({ ...record, standardTags: splitListInput(value) }))}
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
                              return { ...record, standardTags: Array.from(next) }
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
                  value={joinListInput(selectedRecord.specialties)}
                  hint="保留原始研究方向，用分号或换行分隔"
                  onChange={(value) => updateSelectedRecord((record) => ({ ...record, specialties: splitListInput(value) }))}
                />

                <TextAreaField
                  label="简介"
                  value={selectedRecord.bio}
                  onChange={(value) => updateSelectedRecord((record) => ({ ...record, bio: value }))}
                />

                <TextAreaField
                  label="学术成就"
                  value={joinListInput(selectedRecord.achievements)}
                  hint="用分号或换行分隔"
                  onChange={(value) => updateSelectedRecord((record) => ({ ...record, achievements: splitListInput(value) }))}
                />

                <TextAreaField
                  label="代表著作"
                  value={joinListInput(selectedRecord.publications)}
                  hint="用分号或换行分隔"
                  onChange={(value) => updateSelectedRecord((record) => ({ ...record, publications: splitListInput(value) }))}
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
  onChange,
}: {
  label: string
  value: string
  hint?: string
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
        rows={4}
        className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(92,64,48,0.12)', color: '#241810', resize: 'vertical' }}
      />
    </label>
  )
}
