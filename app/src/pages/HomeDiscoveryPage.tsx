import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Building2,
  CalendarPlus,
  ChevronRight,
  Link2,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  getHomepageRecommendedProfessors,
  getHomepageUniversities,
  getRecentProfessorEntries,
} from '@/lib/homeDiscovery';
import { loadHomepageConfig, staticHomepageConfig } from '@/data/homepage';
import { HOMEPAGE_SECTION_LIMITS } from '@/lib/homepageConfig';
import { getUniversityNameParts } from '@/lib/universityNames';
import type { Professor, ProfessorRecord, Region } from '@/types';

function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="font-kai text-[20px] md:text-[23px]" style={{ color: '#34271c', letterSpacing: '0.05em' }}>
        {title}
      </h2>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 font-kai text-[12px] transition-opacity hover:opacity-70"
          style={{ color: '#6d7958' }}
        >
          {action}
          <ArrowRight size={13} strokeWidth={1.7} />
        </button>
      ) : null}
    </div>
  );
}

function getProfessorTitleMeta(title: Professor['title']) {
  if (title === 'professor') return { label: '教授', background: '#97352f' };
  if (title === 'associate') return { label: '副教授', background: '#9b6b2f' };
  if (title === 'assistant') return { label: '助理教授', background: '#668170' };
  return { label: '讲师', background: '#6f7460' };
}

function RecommendedProfessorCard({
  professor,
  onProfessorClick,
  desktop = false,
}: {
  professor: ProfessorRecord;
  onProfessorClick: (professor: Professor) => void;
  desktop?: boolean;
}) {
  const universityName = getUniversityNameParts(professor.university).nameZh;
  const titleMeta = getProfessorTitleMeta(professor.title);

  return (
    <button
      type="button"
      key={professor.id}
      onClick={() => onProfessorClick(professor)}
      className={`relative flex shrink-0 flex-col rounded-[18px] p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg md:rounded-[20px] md:px-4 md:py-3 ${
        desktop
          ? 'min-h-[148px] basis-auto'
          : 'min-h-[148px] basis-[calc((100%_-_0.75rem)_/_2)] md:min-h-[152px] md:basis-[calc((100%_-_0.75rem)_/_2)]'
      }`}
      style={{
        background: 'linear-gradient(145deg, rgba(252,248,240,0.91), rgba(239,230,213,0.76))',
        border: '1px solid rgba(139,120,87,0.16)',
        boxShadow: '0 8px 18px rgba(56,44,30,0.055)',
      }}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span
            className="inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-kai text-[11px] md:px-3 md:py-1.5 md:text-[13px] lg:px-3 lg:py-1 lg:text-[12px]"
            style={{
              color: '#fffaf0',
              backgroundColor: titleMeta.background,
              border: '1px solid rgba(255,248,236,0.2)',
              boxShadow: '0 4px 10px rgba(60,32,22,0.11), inset 0 1px 0 rgba(255,255,255,0.16)',
            }}
          >
            {titleMeta.label}
          </span>
        </span>
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9 lg:h-8 lg:w-8"
          style={{
            color: '#755f4b',
            backgroundColor: 'rgba(255,253,248,0.56)',
            border: '1px solid rgba(139,120,87,0.14)',
          }}
        >
          <Bookmark size={14} strokeWidth={1.55} />
        </span>
      </span>

      <span className="mt-3 min-w-0">
        <strong className="block truncate font-kai text-[16px] font-normal md:text-[21px] lg:text-[19px]" style={{ color: '#302419' }}>{professor.name}</strong>
        {professor.nameEn ? (
          <em className="mt-1 block truncate font-roman-display text-[10px] font-normal italic md:text-[13px] lg:text-[12px]" style={{ color: '#9a8977' }}>
            {professor.nameEn}
          </em>
        ) : null}
      </span>
      <span className="mt-1.5 block truncate font-kai text-[11px] md:text-[14px] lg:text-[13px]" style={{ color: '#826f5c' }}>{universityName}</span>

      <span className="mt-auto block h-px w-full" style={{ backgroundColor: 'rgba(92,64,48,0.1)' }} />
      <span className="mt-1.5 flex items-center gap-1.5" style={{ color: '#b8ad9b' }}>
        <span className="flex items-center gap-0 md:gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} size={14} strokeWidth={1.25} className="md:h-[18px] md:w-[18px] lg:h-4 lg:w-4" />
          ))}
        </span>
        <span className="whitespace-nowrap font-kai text-[10px] md:text-[13px] lg:text-[12px]">未评分</span>
      </span>
    </button>
  );
}

function HorizontalScrollRail({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [railState, setRailState] = useState({ left: 0, width: 100, visible: false });

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const updateRail = () => {
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const width = Math.max(22, Math.min(100, (scroller.clientWidth / scroller.scrollWidth) * 100));
      const left = maxScroll > 0
        ? (scroller.scrollLeft / maxScroll) * (100 - width)
        : 0;

      setRailState({ left, width, visible: maxScroll > 2 });
    };

    updateRail();
    scroller.addEventListener('scroll', updateRail, { passive: true });
    window.addEventListener('resize', updateRail);

    return () => {
      scroller.removeEventListener('scroll', updateRail);
      window.removeEventListener('resize', updateRail);
    };
  }, [scrollRef]);

  if (!railState.visible) return null;

  return (
    <div
      className="mx-auto mt-1 h-1 w-[92px] overflow-hidden rounded-full md:w-[132px]"
      style={{ backgroundColor: 'rgba(92,64,48,0.12)' }}
      aria-hidden="true"
    >
      <span
        className="block h-full rounded-full transition-[margin] duration-150"
        style={{
          width: `${railState.width}%`,
          marginLeft: `${railState.left}%`,
          backgroundColor: 'rgba(102,118,83,0.78)',
          boxShadow: '0 1px 4px rgba(82,98,66,0.18)',
        }}
      />
    </div>
  );
}

export default function HomeDiscoveryPage({
  professors,
  regions,
  onOpenCategory,
  onOpenAcademies,
  onProfessorClick,
}: {
  professors: ProfessorRecord[];
  regions: Region[];
  onOpenCategory: () => void;
  onOpenAcademies: () => void;
  onProfessorClick: (professor: Professor) => void;
}) {
  const [homepageConfig, setHomepageConfig] = useState(staticHomepageConfig);
  const recommendedProfessors = getHomepageRecommendedProfessors(
    professors,
    homepageConfig.recommendedProfessorRefs,
    HOMEPAGE_SECTION_LIMITS.recommendedProfessors,
  );
  const popularUniversities = getHomepageUniversities(
    regions,
    homepageConfig.academyUniversityRefs,
    HOMEPAGE_SECTION_LIMITS.academyUniversities,
  );
  const recommendedScrollRef = useRef<HTMLDivElement>(null);
  const professorByReference = new Map(
    professors.flatMap((professor) => [[professor.id, professor], [professor.name, professor]] as const),
  );
  const recentEntries = homepageConfig.recentEntries.length > 0
    ? homepageConfig.recentEntries.slice(0, HOMEPAGE_SECTION_LIMITS.recentEntries).map((entry) => ({
      ...entry,
      professor: entry.professorRef ? professorByReference.get(entry.professorRef) : undefined,
    }))
    : getRecentProfessorEntries(professors).map(({ professor, recordedAt }) => ({
      id: professor.id,
      kind: 'professor' as const,
      title: `新增学者 · ${professor.name}`,
      detail: getUniversityNameParts(professor.university).nameZh,
      recordedAt,
      professor,
    }));

  useEffect(() => {
    let cancelled = false;

    loadHomepageConfig().then((config) => {
      if (!cancelled) setHomepageConfig(config);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-[1180px] px-3 pb-5 md:px-6 md:pb-10">
      <button
        type="button"
        onClick={onOpenCategory}
        className="group flex w-full items-center gap-3 rounded-[18px] px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg md:px-5"
        style={{
          background: 'linear-gradient(135deg, rgba(252,248,240,0.92), rgba(238,230,213,0.78))',
          border: '1px solid rgba(139,120,87,0.18)',
          boxShadow: '0 10px 24px rgba(56,44,30,0.07)',
        }}
      >
        <span
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ color: '#687756', backgroundColor: 'rgba(255,253,248,0.7)', border: '1px solid rgba(102,118,83,0.15)' }}
        >
          <Search size={21} strokeWidth={1.7} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block font-kai text-[19px] font-normal" style={{ color: '#34271c', letterSpacing: '0.05em' }}>
            查找学者
          </strong>
          <span className="mt-1 block font-kai text-[12px] leading-5" style={{ color: '#897763' }}>
            按地区、院校与研究方向浏览完整名录
          </span>
        </span>
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5"
          style={{ color: '#687756', backgroundColor: 'rgba(102,118,83,0.1)' }}
        >
          <ArrowRight size={17} strokeWidth={1.8} />
        </span>
      </button>

      <section className="mt-6">
        <div>
          <SectionTitle title="推荐学者" action="查看分类" onAction={onOpenCategory} />
          <div ref={recommendedScrollRef} className="scrollbar-hide flex gap-3 overflow-x-auto pb-2 lg:hidden">
            {recommendedProfessors.map((professor) => (
              <RecommendedProfessorCard
                key={professor.id}
                professor={professor}
                onProfessorClick={onProfessorClick}
              />
            ))}
          </div>
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
            {recommendedProfessors.map((professor) => (
              <RecommendedProfessorCard
                key={professor.id}
                professor={professor}
                onProfessorClick={onProfessorClick}
                desktop
              />
            ))}
          </div>
          <div className="lg:hidden">
            <HorizontalScrollRail scrollRef={recommendedScrollRef} />
          </div>
        </div>
      </section>

      <section className="mt-5">
        <SectionTitle title="院校导览" action="进入院校导航" onAction={onOpenAcademies} />
        <div
          className="overflow-hidden rounded-[18px]"
          style={{ backgroundColor: 'rgba(252,248,240,0.76)', border: '1px solid rgba(139,120,87,0.16)' }}
        >
          {popularUniversities.map((university, index) => (
            <button
              type="button"
              key={university.key}
              onClick={onOpenAcademies}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[rgba(102,118,83,0.06)]"
              style={{ borderTop: index > 0 ? '1px solid rgba(139,120,87,0.11)' : undefined }}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: '#71805f', backgroundColor: 'rgba(102,118,83,0.09)' }}>
                <Building2 size={16} strokeWidth={1.65} />
              </span>
              <span className="min-w-0 flex-1 truncate font-kai text-[15px]" style={{ color: '#4e3e30' }}>
                {university.nameZh}
              </span>
              <span className="shrink-0 font-kai text-[12px]" style={{ color: '#978674' }}>{university.scholarCount} 位学者</span>
              <ChevronRight size={15} strokeWidth={1.6} style={{ color: '#978674' }} />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <SectionTitle title="近期收录" />
        <div
          className="overflow-hidden rounded-[18px] px-4"
          style={{ backgroundColor: 'rgba(252,248,240,0.74)', border: '1px solid rgba(139,120,87,0.15)' }}
        >
          {recentEntries.length > 0 ? (
            recentEntries.map((entry, index) => (
              <button
                type="button"
                key={entry.id}
                onClick={() => entry.professor && onProfessorClick(entry.professor)}
                disabled={!entry.professor}
                className="flex w-full items-center gap-3 py-3 text-left transition-opacity hover:opacity-70"
                style={{ borderTop: index > 0 ? '1px solid rgba(139,120,87,0.1)' : undefined }}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: '#a54a39', backgroundColor: 'rgba(176,53,40,0.08)' }}>
                  {entry.kind === 'academy' ? (
                    <Building2 size={15} strokeWidth={1.65} />
                  ) : entry.kind === 'website' ? (
                    <Link2 size={15} strokeWidth={1.65} />
                  ) : (
                    <CalendarPlus size={15} strokeWidth={1.65} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-kai text-[14px]" style={{ color: '#5f4d3d' }}>
                    {entry.title}
                  </span>
                  <span className="mt-1 block truncate font-kai text-[11px]" style={{ color: '#9a8977' }}>
                    {entry.detail}
                  </span>
                </span>
                <time className="shrink-0 font-kai text-[11px]" style={{ color: '#a09180' }} dateTime={entry.recordedAt}>
                  {new Date(entry.recordedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                </time>
              </button>
            ))
          ) : (
            <p className="flex items-center gap-2 py-4 font-kai text-[13px]" style={{ color: '#978674' }}>
              <Sparkles size={15} strokeWidth={1.6} />
              新收录资料将在这里展示
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
