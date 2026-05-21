import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import type { Professor, FilterRegion } from '@/types';
import { regions, specialtyCategories } from '@/data/professors';
import type { TitleFilter, InstitutionFilter, SpecialtyFilter } from '@/sections/FilterBar';
import { getRating, submitRating, type RatingData } from '@/lib/ratings';


interface ProfessorListProps {
  filter: FilterRegion;
  searchQuery: string;
  titleFilter: TitleFilter;
  institutionFilter: InstitutionFilter;
  specialtyFilter: SpecialtyFilter;
  subRegion: string;
  onProfessorClick: (professor: Professor) => void;
}

function InteractiveRating({ professorId }: { professorId: string }) {
  const [rating, setRating] = useState<RatingData>({ average: 0, count: 0, userRating: 0 });
  const [hoverScore, setHoverScore] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRating(professorId).then((data) => {
      if (!cancelled) setRating(data);
    });
    return () => {
      cancelled = true;
    };
  }, [professorId]);

  const displayScore = isInteracting && hoverScore ? hoverScore : rating.userRating || rating.average;

  const handleStarPointer = (event: MouseEvent<HTMLButtonElement>, index: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left <= rect.width / 2;
    setHoverScore(index + (isLeftHalf ? 0.5 : 1));
  };

  const handleSubmit = async (event: MouseEvent<HTMLButtonElement>, index: number) => {
    event.stopPropagation();
    if (isSaving) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left <= rect.width / 2;
    const score = index + (isLeftHalf ? 0.5 : 1);

    setIsSaving(true);
    try {
      const next = await submitRating(professorId, score);
      setRating(next);
      setHoverScore(0);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 font-serif text-sm"
      style={{ color: '#8a7d6e' }}
      onClick={(event) => event.stopPropagation()}
      onMouseLeave={() => {
        setHoverScore(0);
        setIsInteracting(false);
      }}
    >
      <span className="flex items-center gap-0.5" aria-label="学者评分">
        {Array.from({ length: 5 }).map((_, index) => {
          const fillRatio = Math.max(0, Math.min(1, displayScore - index));
          return (
            <button
              key={index}
              type="button"
              className="relative h-5 w-5 cursor-pointer p-0 transition-transform hover:scale-105 disabled:cursor-wait"
              disabled={isSaving}
              onMouseMove={(event) => handleStarPointer(event, index)}
              onMouseEnter={() => setIsInteracting(true)}
              onFocus={() => {
                setIsInteracting(true);
                setHoverScore(index + 1);
              }}
              onBlur={() => {
                setHoverScore(0);
                setIsInteracting(false);
              }}
              onClick={(event) => handleSubmit(event, index)}
              aria-label={`评分 ${index + 0.5} 到 ${index + 1} 分`}
              style={{ background: 'transparent', border: 'none' }}
            >
              <Star
                size={20}
                strokeWidth={1.25}
                style={{ color: '#b8ad9b', position: 'absolute', inset: 0 }}
              />
              <span
                className="absolute left-0 top-0 h-5 overflow-hidden"
                style={{ width: `${fillRatio * 100}%`, color: '#c89413' }}
              >
                <Star size={20} strokeWidth={1.25} fill="currentColor" />
              </span>
            </button>
          );
        })}
      </span>
      {rating.count > 0 ? (
        <span>{rating.average.toFixed(1)} · {rating.count}人</span>
      ) : (
        <span>未评分</span>
      )}
    </div>
  );
}

export default function ProfessorList({
  filter,
  searchQuery,
  titleFilter,
  institutionFilter,
  specialtyFilter,
  subRegion,
  onProfessorClick,
}: ProfessorListProps) {
  const getTitleMeta = (title: Professor['title']) => {
    switch (title) {
      case 'professor':
        return { label: '教授', background: '#8a2020', color: '#fff8ec', border: 'rgba(104, 25, 25, 0.22)' };
      case 'associate':
        return { label: '副教授', background: '#8b5a24', color: '#fff7e8', border: 'rgba(120, 72, 25, 0.22)' };
      case 'assistant':
        return { label: '助理教授', background: '#4d6f63', color: '#f5fff8', border: 'rgba(56, 94, 78, 0.22)' };
      case 'lecturer':
        return { label: '讲师', background: '#4f607c', color: '#f4f7ff', border: 'rgba(58, 76, 110, 0.22)' };
      default:
        return { label: '学者', background: '#8a7d6e', color: '#fff8ec', border: 'rgba(92, 64, 48, 0.18)' };
    }
  };

  // ─── Filter logic ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = regions;
    const q = searchQuery.trim().toLowerCase();

    // 1. Text search (name, university, specialties)
    if (q) {
      data = data.map(region => ({
        ...region,
        universities: region.universities.map(uni => ({
          ...uni,
          professors: uni.professors.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.nameEn?.toLowerCase().includes(q) ||
            p.university.toLowerCase().includes(q) ||
            p.specialties.some(s => s.toLowerCase().includes(q))
          ),
        })).filter(u => u.professors.length > 0),
      })).filter(r => r.universities.length > 0);
    }

    // 2. Region filter
    if (filter === 'china') {
      data = data.filter(r => ['huabei', 'huadong', 'huanan', 'zhongxibu', 'gangtai'].includes(r.id));
      if (subRegion !== 'all') {
        data = data.filter(r => r.id === subRegion);
      }
    } else if (filter === 'overseas') {
      data = data.filter(r => ['north-america', 'europe', 'japan'].includes(r.id));
      if (subRegion !== 'all') {
        data = data.filter(r => r.id === subRegion);
      }
    } else if (filter !== 'all') {
      data = data.filter(r => r.id === filter);
    }

    // 3. Title filter
    if (titleFilter !== 'all') {
      data = data.map(region => ({
        ...region,
        universities: region.universities.map(uni => ({
          ...uni,
          professors: uni.professors.filter(p => p.title === titleFilter),
        })).filter(u => u.professors.length > 0),
      })).filter(r => r.universities.length > 0);
    }

    // 4. Institution type filter
    if (institutionFilter !== 'all') {
      const domesticIds = ['huabei', 'huadong', 'huanan', 'zhongxibu', 'gangtai'];
      const overseasIds = ['north-america', 'europe', 'japan'];
      data = data.filter(r =>
        institutionFilter === 'domestic' ? domesticIds.includes(r.id) : overseasIds.includes(r.id)
      );
    }

    // 5. Specialty filter
    if (specialtyFilter !== 'all') {
      const cat = specialtyCategories.find(c => c.key === specialtyFilter);
      if (cat) {
        data = data.map(region => ({
          ...region,
          universities: region.universities.map(uni => ({
            ...uni,
            professors: uni.professors.filter(p =>
              p.specialties.some(s => cat.keywords.some(kw => s.includes(kw)))
            ),
          })).filter(u => u.professors.length > 0),
        })).filter(r => r.universities.length > 0);
      }
    }

    return data;
  }, [filter, searchQuery, titleFilter, institutionFilter, specialtyFilter, subRegion]);

  return (
    <section className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-8 pt-4 pb-8">
      {/* Result count */}
      <div className="flex items-center justify-between mb-5">
        <span className="font-kai text-base" style={{ color: '#8a7d6e' }}>
          搜索结果
        </span>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="font-kai text-sm text-center py-12" style={{ color: '#8a7d6e' }}>
          未找到匹配的学者，请调整筛选条件
        </p>
      ) : (
        <div className="space-y-6">
          {filtered.map(region => (
            <div key={region.id}>
              <div className="mb-5 flex items-center gap-3">
                <h2 className="font-kai text-2xl font-semibold md:text-3xl" style={{ color: '#3a2e22', letterSpacing: '0.03em' }}>
                  {region.name}
                </h2>
                <span
                  className="rounded-full px-2.5 py-1 font-serif text-sm md:text-base"
                  style={{
                    backgroundColor: 'rgba(92, 64, 48, 0.08)',
                    color: '#6a5544',
                    border: '1px solid rgba(92, 64, 48, 0.10)',
                  }}
                >
                  {region.universities.reduce((s, u) => s + u.professors.length, 0)}人
                </span>
              </div>

              <div className="space-y-7">
                {region.universities.map(uni => (
                  <div key={uni.name}>
                    <div className="mb-4 flex items-center gap-4">
                      <h3
                        className="shrink-0 font-kai text-2xl font-semibold md:text-3xl"
                        style={{ color: '#221a13', letterSpacing: '0.02em' }}
                      >
                        {uni.name}
                      </h3>
                      <div className="h-px flex-1" style={{ backgroundColor: 'rgba(92, 64, 48, 0.18)' }} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {uni.professors.map(prof => (
                        <article
                          key={prof.id}
                          onClick={() => onProfessorClick(prof)}
                          className="group cursor-pointer rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                          style={{
                            backgroundColor: 'rgba(250, 247, 240, 0.92)',
                            border: '1px solid rgba(92, 64, 48, 0.13)',
                            boxShadow: '0 8px 18px rgba(50, 42, 32, 0.08)',
                          }}
                        >
                          {(() => {
                            const titleMeta = getTitleMeta(prof.title);
                            return (
                              <>
                                <div className="flex items-start justify-between gap-3">
                                  <span
                                    className="font-kai rounded-md px-3 py-1 text-sm shadow-sm"
                                    style={{
                                      backgroundColor: titleMeta.background,
                                      color: titleMeta.color,
                                      border: `1px solid ${titleMeta.border}`,
                                      letterSpacing: '0.02em',
                                    }}
                                  >
                                    {titleMeta.label}
                                  </span>
                                  <span
                                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-serif text-sm"
                                    style={{
                                      backgroundColor: 'rgba(92, 64, 48, 0.07)',
                                      color: '#6a5544',
                                      border: '1px solid rgba(92, 64, 48, 0.14)',
                                    }}
                                    aria-label="查看评价"
                                  >
                                    <MessageSquare size={15} strokeWidth={1.7} />
                                    评价
                                  </span>
                                </div>

                                <div className="mt-4">
                                  <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                                    <h4 className="font-kai text-xl font-semibold leading-tight" style={{ color: '#221a13' }}>
                                      {prof.name}
                                    </h4>
                                    {prof.nameEn && (
                                      <span className="font-serif text-xs italic" style={{ color: '#8a7d6e' }}>
                                        {prof.nameEn}
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-kai mt-1 text-sm" style={{ color: '#5f5144' }}>
                                    {prof.university}
                                  </p>
                                </div>

                                <div className="my-3 h-px" style={{ backgroundColor: 'rgba(92, 64, 48, 0.09)' }} />

                                <div className="flex flex-wrap content-start items-start gap-1.5">
                                  {prof.specialties.slice(0, 3).map((s, i) => (
                                    <span
                                      key={i}
                                      className="font-kai rounded px-2 py-0.5 text-sm"
                                      style={{
                                        backgroundColor: 'rgba(92, 64, 48, 0.06)',
                                        color: '#5c4030',
                                      }}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>

                                <div className="my-3 h-px" style={{ backgroundColor: 'rgba(92, 64, 48, 0.09)' }} />

                                <InteractiveRating professorId={prof.id} />
                              </>
                            );
                          })()}
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
