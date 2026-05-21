import { useMemo } from 'react';
import type { Professor, FilterRegion } from '@/types';
import { regions, specialtyCategories } from '@/data/professors';
import type { TitleFilter, InstitutionFilter, SpecialtyFilter } from '@/sections/FilterBar';


interface ProfessorListProps {
  filter: FilterRegion;
  searchQuery: string;
  titleFilter: TitleFilter;
  institutionFilter: InstitutionFilter;
  specialtyFilter: SpecialtyFilter;
  subRegion: string;
  onProfessorClick: (professor: Professor) => void;
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

  const total = filtered.reduce((s, r) => s + r.universities.reduce((t, u) => t + u.professors.length, 0), 0);

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-8">
      {/* Result count */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-kai text-[12px]" style={{ color: '#8a7d6e' }}>
          搜索结果
        </span>
        <span className="font-serif text-[11px]" style={{ color: '#a0988a' }}>
          共 {total} 位学者
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
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center font-serif text-sm"
                  style={{ backgroundColor: 'rgba(92, 64, 48, 0.08)', color: '#5c4030' }}
                >
                  {region.glyph}
                </span>
                <h2 className="font-kai text-base" style={{ color: '#3a2e22', letterSpacing: '0.04em' }}>
                  {region.name}
                </h2>
                <span className="font-serif text-[11px]" style={{ color: '#a0988a' }}>
                  {region.universities.reduce((s, u) => s + u.professors.length, 0)}人
                </span>
              </div>

              <div className="space-y-4">
                {region.universities.map(uni => (
                  <div key={uni.name}>
                    <h3 className="font-kai text-xs mb-2 px-1" style={{ color: '#8a7d6e', letterSpacing: '0.04em' }}>
                      {uni.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {uni.professors.map(prof => (
                        <button
                          key={prof.id}
                          onClick={() => onProfessorClick(prof)}
                          className="text-left p-3 rounded-lg transition-all duration-200 hover:shadow-md group"
                          style={{
                            backgroundColor: 'rgba(250, 247, 240, 0.7)',
                            border: '1px solid rgba(30, 24, 16, 0.06)',
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-kai text-sm font-medium" style={{ color: '#3a2e22' }}>
                                  {prof.name}
                                </span>
                                {prof.nameEn && (
                                  <span className="font-serif italic text-[10px] truncate" style={{ color: '#8a7d6e' }}>
                                    {prof.nameEn}
                                  </span>
                                )}
                              </div>
                              <p className="font-kai text-[11px] mt-0.5" style={{ color: '#6a5e4e' }}>
                                {prof.university}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {prof.specialties.slice(0, 3).map((s, i) => (
                                  <span
                                    key={i}
                                    className="font-kai text-[10px] px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: 'rgba(92, 64, 48, 0.06)',
                                      color: '#6a5e4e',
                                    }}
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                              <span
                                className="font-kai text-[10px] px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: prof.title === 'professor'
                                    ? 'rgba(92, 64, 48, 0.10)'
                                    : 'rgba(138, 125, 110, 0.10)',
                                  color: prof.title === 'professor' ? '#5c4030' : '#8a7d6e',
                                }}
                              >
                                {prof.title === 'professor' ? '教授'
                                  : prof.title === 'associate' ? '副教授'
                                    : prof.title === 'assistant' ? '助理教授'
                                      : '讲师'}
                              </span>

                            </div>
                          </div>
                        </button>
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
