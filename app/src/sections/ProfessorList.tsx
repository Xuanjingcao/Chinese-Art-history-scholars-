import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ChevronDown, MessageSquare, Star } from 'lucide-react';
import type { Professor, FilterRegion, Region } from '@/types';
import { regions, specialtyCategories } from '@/data/professors';
import type { TitleFilter, SpecialtyFilter } from '@/sections/FilterBar';
import { getRating, submitRating, type RatingData } from '@/lib/ratings';


const domesticRegionIds = ['huabei', 'huadong', 'huanan', 'zhongxibu', 'gangtai'];
const overseasRegionIds = ['north-america', 'europe', 'japan'];
const overseasCountryMap: Record<string, Record<string, string>> = {
  'north-america': {
    '哈佛大学 · Harvard University': '美国',
    '哥伦比亚大学 · Columbia University': '美国',
    '普林斯顿大学 · Princeton University': '美国',
    '宾夕法尼亚大学 · University of Pennsylvania': '美国',
    '芝加哥大学 · University of Chicago': '美国',
    '加州大学洛杉矶分校 · UCLA': '美国',
    '加州大学伯克利分校 · UC Berkeley': '美国',
    '加州大学戴维斯分校 · UC Davis': '美国',
    '威斯康星大学麦迪逊分校 · UW-Madison': '美国',
    '乔治城大学 · Georgetown University': '美国',
    '莱斯大学 · Rice University': '美国',
    '南加州大学 · University of Southern California': '美国',
    '杜克大学 · Duke University': '美国',
    '弗吉尼亚大学 · University of Virginia': '美国',
    '加州大学圣塔芭芭拉分校 · UC Santa Barbara': '美国',
    '纽约大学 · New York University': '美国',
    '加州大学圣迭戈分校 · UC San Diego': '美国',
    '加州大学欧文分校 · UC Irvine': '美国',
    '布兰迪斯大学 · Brandeis University': '美国',
    '波士顿学院 · Boston College': '美国',
    '圣托马斯大学 · University of St. Thomas': '美国',
    '霍巴特和威廉史密斯学院 · Hobart and William Smith Colleges': '美国',
    '北卡罗来纳大学教堂山分校 · UNC Chapel Hill': '美国',
    '埃默里大学 · Emory University': '美国',
    '巴纳德学院 / 哥伦比亚大学 · Barnard College / Columbia University': '美国',
    '麦吉尔大学 · McGill University': '加拿大',
    '不列颠哥伦比亚大学 · University of British Columbia': '加拿大',
    '多伦多大学 · University of Toronto': '加拿大',
    '阿尔伯塔大学 · University of Alberta': '加拿大',
    '卡尔顿大学 · Carleton University': '加拿大',
    '康考迪亚大学 · Concordia University': '加拿大',
  },
  europe: {
    '牛津大学 · University of Oxford': '英国',
    '伦敦大学亚非学院 · SOAS': '英国',
    '考陶德艺术学院 · Courtauld Institute': '英国',
    '海德堡大学 · Heidelberg University': '德国',
    '慕尼黑大学 · LMU Munich': '德国',
    '汉堡大学 · University of Hamburg': '德国',
    '柏林自由大学 · Free University of Berlin': '德国',
    '索邦大学 · Sorbonne University': '法国',
    '里尔大学 · University of Lille': '法国',
    '莱顿大学 · Leiden University': '荷兰',
    '维也纳大学 · University of Vienna': '奥地利',
    '鲁汶大学 · KU Leuven': '比利时',
  },
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s·•,，.。;；:：'"“”‘’()（）\-_/]/g, '');
}

function isSubsequenceMatch(query: string, target: string) {
  if (!query) return true;
  let queryIndex = 0;

  for (const char of target) {
    if (char === query[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === query.length) return true;
    }
  }

  return false;
}

function getMaxEditDistance(queryLength: number) {
  if (queryLength <= 2) return 0;
  if (queryLength <= 6) return 1;
  return 2;
}

function levenshteinDistanceWithinLimit(source: string, target: string, limit: number) {
  const sourceLength = source.length;
  const targetLength = target.length;

  if (Math.abs(sourceLength - targetLength) > limit) return limit + 1;
  if (source === target) return 0;
  if (sourceLength === 0) return targetLength;
  if (targetLength === 0) return sourceLength;

  let previousRow = Array.from({ length: targetLength + 1 }, (_, index) => index);

  for (let i = 1; i <= sourceLength; i += 1) {
    const currentRow = [i];
    let rowMin = currentRow[0];

    for (let j = 1; j <= targetLength; j += 1) {
      const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
      const nextValue = Math.min(
        previousRow[j] + 1,
        currentRow[j - 1] + 1,
        previousRow[j - 1] + substitutionCost,
      );

      currentRow.push(nextValue);
      rowMin = Math.min(rowMin, nextValue);
    }

    if (rowMin > limit) return limit + 1;
    previousRow = currentRow;
  }

  return previousRow[targetLength];
}

function hasApproximateMatch(query: string, target: string) {
  if (!query || !target) return false;

  const maxDistance = getMaxEditDistance(query.length);
  if (maxDistance === 0) return false;

  if (target.length <= query.length + maxDistance) {
    return levenshteinDistanceWithinLimit(query, target, maxDistance) <= maxDistance;
  }

  const minWindowLength = Math.max(1, query.length - maxDistance);
  const maxWindowLength = Math.min(target.length, query.length + maxDistance);

  for (let windowLength = minWindowLength; windowLength <= maxWindowLength; windowLength += 1) {
    for (let start = 0; start <= target.length - windowLength; start += 1) {
      const segment = target.slice(start, start + windowLength);
      if (levenshteinDistanceWithinLimit(query, segment, maxDistance) <= maxDistance) {
        return true;
      }
    }
  }

  return false;
}

function fuzzyMatch(query: string, ...candidates: string[]) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  return candidates.some(candidate => {
    const normalizedCandidate = normalizeSearchText(candidate);
    return (
      normalizedCandidate.includes(normalizedQuery) ||
      isSubsequenceMatch(normalizedQuery, normalizedCandidate) ||
      hasApproximateMatch(normalizedQuery, normalizedCandidate)
    );
  });
}

function groupUniversitiesByCountry(region: Region) {
  const countryMap = overseasCountryMap[region.id];
  if (!countryMap) return null;

  const grouped = new Map<string, Region['universities']>();

  region.universities.forEach((university) => {
    const country = countryMap[university.name] ?? '其他';
    const list = grouped.get(country) ?? [];
    list.push(university);
    grouped.set(country, list);
  });

  return Array.from(grouped.entries()).map(([country, universities]) => ({
    country,
    universities,
    professorCount: universities.reduce((sum, uni) => sum + uni.professors.length, 0),
  }));
}

function getCardUniversityName(name: string) {
  return name.split(' · ')[0];
}

function getUniversityNameParts(name: string) {
  const [nameZh, nameEn] = name.split(' · ');
  return {
    nameZh: nameZh?.trim() ?? name,
    nameEn: nameEn?.trim() ?? '',
  };
}

interface ProfessorListProps {
  filter: FilterRegion;
  searchQuery: string;
  titleFilter: TitleFilter;
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
  specialtyFilter,
  subRegion,
  onProfessorClick,
}: ProfessorListProps) {
  const hasActiveSearch = searchQuery.trim().length > 0;

  const getTitleMeta = (title: Professor['title']) => {
    switch (title) {
      case 'professor':
        return { label: '教授', background: '#8b2f2c', color: '#fff8ec' };
      case 'associate':
        return { label: '副教授', background: '#8a6333', color: '#fff7e8' };
      case 'assistant':
        return { label: '助理教授', background: '#61786b', color: '#f5fff8' };
      case 'lecturer':
        return { label: '讲师', background: '#627088', color: '#f4f7ff' };
      default:
        return { label: '学者', background: '#8a7d6e', color: '#fff8ec' };
    }
  };

  // ─── Filter logic ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = regions;
    const q = searchQuery.trim();

    // 1. Text search (name, university, specialties)
    if (q) {
      data = data.map(region => ({
        ...region,
        universities: region.universities.map(uni => ({
          ...uni,
          professors: uni.professors.filter(p =>
            fuzzyMatch(
              q,
              p.name,
              p.nameEn ?? '',
              p.university,
              p.bio,
              ...p.specialties,
              ...p.achievements,
              ...p.publications,
            )
          ),
        })).filter(u => u.professors.length > 0),
      })).filter(r => r.universities.length > 0);
    }

    // 2. Region filter
    if (filter === 'china') {
      data = data.filter(r => domesticRegionIds.includes(r.id));
      if (subRegion !== 'all') {
        data = data.filter(r => r.id === subRegion);
      }
    } else if (filter === 'overseas') {
      data = data.filter(r => overseasRegionIds.includes(r.id));
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

    // 4. Specialty filter
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
  }, [filter, searchQuery, titleFilter, specialtyFilter, subRegion]);

  const displayRegions = useMemo(() => {
    const shouldMergeChina = (filter === 'all' || filter === 'china') && subRegion === 'all';
    if (!shouldMergeChina) return filtered;

    const domesticRegions = filtered.filter(region => domesticRegionIds.includes(region.id));
    const otherRegions = filtered.filter(region => !domesticRegionIds.includes(region.id));

    if (domesticRegions.length === 0) return otherRegions;

    const chinaRegion: Region = {
      id: 'china',
      glyph: '中',
      name: '中国',
      nameEn: 'China',
      count: domesticRegions.reduce((sum, region) => sum + region.count, 0),
      universities: domesticRegions.flatMap(region => region.universities),
    };

    return [chinaRegion, ...otherRegions];
  }, [filter, filtered, subRegion]);

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
          {displayRegions.map(region => (
            <RegionSection
              key={region.id}
              region={region}
              forceExpanded={hasActiveSearch}
              getTitleMeta={getTitleMeta}
              onProfessorClick={onProfessorClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RegionSection({
  region,
  forceExpanded,
  getTitleMeta,
  onProfessorClick,
}: {
  region: Region;
  forceExpanded?: boolean;
  getTitleMeta: (title: Professor['title']) => { label: string; background: string; color: string };
  onProfessorClick: (professor: Professor) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hasInitializedViewport = useRef(false);
  const previousIsMobile = useRef(false);
  const professorCount = region.universities.reduce((sum, uni) => sum + uni.professors.length, 0);
  const sectionId = `region-section-${region.id}`;
  const countryGroups = groupUniversitiesByCountry(region);

  useEffect(() => {
    const updateViewportState = () => {
      const nextIsMobile = window.innerWidth < 768;

      setIsMobile(() => {
        if (!hasInitializedViewport.current) {
          hasInitializedViewport.current = true;
          previousIsMobile.current = nextIsMobile;
          setCollapsed(nextIsMobile && !forceExpanded);
          return nextIsMobile;
        }

        if (previousIsMobile.current !== nextIsMobile) {
          previousIsMobile.current = nextIsMobile;
          setCollapsed(nextIsMobile && !forceExpanded);
        }

        return nextIsMobile;
      });
    };

    updateViewportState();
    window.addEventListener('resize', updateViewportState);
    return () => window.removeEventListener('resize', updateViewportState);
  }, [forceExpanded]);

  useEffect(() => {
    if (hasInitializedViewport.current && isMobile) {
      setCollapsed(!forceExpanded);
    }
  }, [forceExpanded, isMobile]);

  return (
    <div>
      <button
        type="button"
        className="mb-5 flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
        onClick={() => setCollapsed(value => !value)}
        aria-expanded={!collapsed}
        aria-controls={sectionId}
      >
        <h2 className="font-kai text-xl font-medium md:text-3xl md:font-semibold" style={{ color: '#3a2e22', letterSpacing: '0.03em' }}>
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
          {professorCount}人
        </span>
        <ChevronDown
          size={22}
          strokeWidth={1.7}
          className="transition-transform duration-200"
          style={{
            color: '#7a6653',
            transform: isMobile
              ? (collapsed ? 'rotate(-90deg)' : 'rotate(0deg)')
              : (collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'),
          }}
          aria-hidden="true"
        />
      </button>

      {!collapsed && (
        <div id={sectionId} className="space-y-7">
          {countryGroups ? (
            countryGroups.map(group => (
              <CountrySection
                key={`${region.id}-${group.country}`}
                regionId={region.id}
                country={group.country}
                professorCount={group.professorCount}
                universities={group.universities}
                forceExpanded={forceExpanded}
                getTitleMeta={getTitleMeta}
                onProfessorClick={onProfessorClick}
              />
            ))
          ) : (
            region.universities.map(uni => (
              <UniversitySection
                key={uni.name}
                university={uni}
                forceExpanded={forceExpanded}
                getTitleMeta={getTitleMeta}
                onProfessorClick={onProfessorClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CountrySection({
  regionId,
  country,
  professorCount,
  universities,
  forceExpanded,
  getTitleMeta,
  onProfessorClick,
}: {
  regionId: string;
  country: string;
  professorCount: number;
  universities: Region['universities'];
  forceExpanded?: boolean;
  getTitleMeta: (title: Professor['title']) => { label: string; background: string; color: string };
  onProfessorClick: (professor: Professor) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hasInitializedViewport = useRef(false);
  const previousIsMobile = useRef(false);
  const sectionId = `country-section-${regionId}-${country}`;

  useEffect(() => {
    const updateViewportState = () => {
      const nextIsMobile = window.innerWidth < 768;

      setIsMobile(() => {
        if (!hasInitializedViewport.current) {
          hasInitializedViewport.current = true;
          previousIsMobile.current = nextIsMobile;
          setCollapsed(nextIsMobile && !forceExpanded);
          return nextIsMobile;
        }

        if (previousIsMobile.current !== nextIsMobile) {
          previousIsMobile.current = nextIsMobile;
          setCollapsed(nextIsMobile && !forceExpanded);
        }

        return nextIsMobile;
      });
    };

    updateViewportState();
    window.addEventListener('resize', updateViewportState);
    return () => window.removeEventListener('resize', updateViewportState);
  }, [forceExpanded]);

  useEffect(() => {
    if (hasInitializedViewport.current && isMobile) {
      setCollapsed(!forceExpanded);
    }
  }, [forceExpanded, isMobile]);

  return (
    <div className="space-y-5">
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
        onClick={() => setCollapsed(value => !value)}
        aria-expanded={!collapsed}
        aria-controls={sectionId}
      >
        <h3 className="font-kai text-lg font-medium md:text-2xl md:font-semibold" style={{ color: '#2c2118', letterSpacing: '0.02em' }}>
          {country}
        </h3>
        <span
          className="rounded-full px-2.5 py-1 font-serif text-sm"
          style={{
            backgroundColor: 'rgba(92, 64, 48, 0.08)',
            color: '#6a5544',
            border: '1px solid rgba(92, 64, 48, 0.10)',
          }}
        >
          {professorCount}人
        </span>
        <ChevronDown
          size={20}
          strokeWidth={1.7}
          className="transition-transform duration-200"
          style={{
            color: '#7a6653',
            transform: isMobile
              ? (collapsed ? 'rotate(-90deg)' : 'rotate(0deg)')
              : (collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'),
          }}
          aria-hidden="true"
        />
        <div className="h-px flex-1" style={{ backgroundColor: 'rgba(92, 64, 48, 0.18)' }} />
      </button>

      {!collapsed && (
        <div id={sectionId} className="space-y-7">
          {universities.map(uni => (
            <UniversitySection
              key={uni.name}
              university={uni}
              forceExpanded={forceExpanded}
              getTitleMeta={getTitleMeta}
              onProfessorClick={onProfessorClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UniversitySection({
  university,
  forceExpanded,
  getTitleMeta,
  onProfessorClick,
}: {
  university: Region['universities'][number];
  forceExpanded?: boolean;
  getTitleMeta: (title: Professor['title']) => { label: string; background: string; color: string };
  onProfessorClick: (professor: Professor) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [desktopColumnCount, setDesktopColumnCount] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const hasInitializedViewport = useRef(false);
  const previousIsMobile = useRef(false);

  useEffect(() => {
    const updateColumns = () => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobile(nextIsMobile);

      if (!hasInitializedViewport.current) {
        hasInitializedViewport.current = true;
        previousIsMobile.current = nextIsMobile;
        setMobileSectionOpen(Boolean(forceExpanded));
      } else if (previousIsMobile.current !== nextIsMobile) {
        previousIsMobile.current = nextIsMobile;
        setMobileSectionOpen(Boolean(forceExpanded));
      }

      if (window.innerWidth >= 1280) {
        setDesktopColumnCount(4);
        return;
      }

      if (window.innerWidth >= 768) {
        setDesktopColumnCount(2);
        return;
      }

      setDesktopColumnCount(null);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [forceExpanded]);

  useEffect(() => {
    if (hasInitializedViewport.current && isMobile) {
      setMobileSectionOpen(Boolean(forceExpanded));
    }
  }, [forceExpanded, isMobile]);

  const canCollapse = desktopColumnCount !== null && university.professors.length > desktopColumnCount;
  const visibleProfessors = isMobile
    ? university.professors
    : canCollapse && !expanded
      ? university.professors.slice(0, desktopColumnCount)
      : university.professors;
  const { nameZh, nameEn } = getUniversityNameParts(university.name);

  return (
    <div>
      {isMobile ? (
        <>
          <button
            type="button"
            onClick={() => setMobileSectionOpen((value) => !value)}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all"
            style={{
              backgroundColor: 'rgba(248, 242, 230, 0.88)',
              border: '1px solid rgba(92, 64, 48, 0.12)',
              boxShadow: '0 6px 16px rgba(50, 42, 32, 0.05)',
            }}
          >
            <div className="min-w-0 flex-1">
              <div className="min-w-0">
                <h3
                  className="truncate font-kai text-[15px] font-medium leading-[1.3]"
                  style={{ color: '#221a13', letterSpacing: '0.02em' }}
                >
                  {nameZh}
                </h3>
                {nameEn ? (
                  <p
                    className="truncate font-serif text-[13px] leading-[1.3]"
                    style={{ color: '#6b5b4b' }}
                  >
                    {nameEn}
                  </p>
                ) : null}
              </div>
            </div>
            <p
              className="shrink-0 whitespace-nowrap font-kai text-sm"
              style={{ color: '#7a6653' }}
            >
              {university.professors.length} 位老师
            </p>
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'rgba(92, 64, 48, 0.08)',
                color: '#5c4030',
              }}
              aria-hidden="true"
            >
              <ChevronDown
                size={18}
                strokeWidth={2}
                style={{
                  transform: mobileSectionOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease',
                }}
              />
            </span>
          </button>

          {mobileSectionOpen && (
            <div className="grid grid-cols-2 gap-3">
              {visibleProfessors.map(prof => (
                <article
                  key={prof.id}
                  onClick={() => onProfessorClick(prof)}
                  className="group cursor-pointer rounded-2xl p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{
                    backgroundColor: 'rgba(244, 237, 220, 0.91)',
                    backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(164, 137, 96, 0.035))',
                    border: '1px solid rgba(92, 64, 48, 0.13)',
                    boxShadow: '0 6px 14px rgba(50, 42, 32, 0.08)',
                  }}
                >
                  {(() => {
                    const titleMeta = getTitleMeta(prof.title);
                    return (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className="font-kai px-2.5 py-1 text-[11px]"
                            style={{
                              backgroundColor: titleMeta.background,
                              color: titleMeta.color,
                              borderRadius: '999px',
                              border: '1px solid rgba(255, 248, 236, 0.24)',
                              letterSpacing: '0.02em',
                              boxShadow: '0 4px 10px rgba(60, 32, 22, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
                            }}
                          >
                            {titleMeta.label}
                          </span>
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: 'rgba(92, 64, 48, 0.07)',
                              color: '#6a5544',
                              border: '1px solid rgba(92, 64, 48, 0.10)',
                              boxShadow: '0 2px 6px rgba(60, 32, 22, 0.06)',
                            }}
                            aria-label="查看评价"
                          >
                            <MessageSquare size={14} strokeWidth={1.7} />
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="flex flex-wrap items-end gap-x-1.5 gap-y-1">
                            <h4 className="font-kai text-lg font-semibold leading-tight" style={{ color: '#221a13' }}>
                              {prof.name}
                            </h4>
                            {prof.nameEn && (
                              <span className="max-w-full truncate font-serif text-[10px] italic" style={{ color: '#8a7d6e' }}>
                                {prof.nameEn}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate font-kai text-[12px]" style={{ color: '#5f5144' }}>
                            {getCardUniversityName(prof.university)}
                          </p>
                        </div>

                        <div className="my-2.5 h-px" style={{ backgroundColor: 'rgba(92, 64, 48, 0.09)' }} />

                        <div className="flex flex-wrap content-start items-start gap-1">
                          {prof.specialties.slice(0, 2).map((s, i) => (
                            <span
                              key={i}
                              className="max-w-full truncate font-kai rounded px-1.5 py-0.5 text-[11px]"
                              style={{
                                backgroundColor: 'rgba(92, 64, 48, 0.06)',
                                color: '#5c4030',
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>

                        <div className="my-2.5 h-px" style={{ backgroundColor: 'rgba(92, 64, 48, 0.09)' }} />

                        <div className="scale-[0.9] origin-left">
                          <InteractiveRating professorId={prof.id} />
                        </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex min-w-0 items-center gap-3 md:gap-4">
            <h3
              className="min-w-0 break-words font-kai text-xl font-semibold md:text-3xl"
              style={{ color: '#221a13', letterSpacing: '0.02em' }}
            >
              {university.name}
            </h3>
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(92, 64, 48, 0.18)' }} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleProfessors.map(prof => (
              <article
                key={prof.id}
                onClick={() => onProfessorClick(prof)}
                className="group cursor-pointer rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  backgroundColor: 'rgba(244, 237, 220, 0.91)',
                  backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(164, 137, 96, 0.035))',
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
                          className="font-kai px-4 py-1.5 text-sm"
                          style={{
                            backgroundColor: titleMeta.background,
                            color: titleMeta.color,
                            borderRadius: '999px',
                            border: '1px solid rgba(255, 248, 236, 0.24)',
                            letterSpacing: '0.02em',
                            boxShadow: '0 5px 14px rgba(60, 32, 22, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
                          }}
                        >
                          {titleMeta.label}
                        </span>
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-serif text-sm"
                          style={{
                            backgroundColor: 'rgba(92, 64, 48, 0.07)',
                            color: '#6a5544',
                            border: '1px solid rgba(92, 64, 48, 0.10)',
                            boxShadow: '0 2px 6px rgba(60, 32, 22, 0.06)',
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
                          {getCardUniversityName(prof.university)}
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
        </>
      )}
      {canCollapse && (
        <div className="mt-3 hidden md:flex justify-end">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all hover:-translate-y-0.5 hover:opacity-90"
            style={{
              fontFamily: 'var(--font-kai)',
              color: '#4b382b',
              background: 'rgba(255, 250, 241, 0.72)',
              border: '1px solid rgba(92, 64, 48, 0.18)',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(60, 32, 22, 0.06)',
            }}
          >
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'rgba(92, 64, 48, 0.08)',
                color: '#5c4030',
              }}
              aria-hidden="true"
            >
              <ChevronDown
                size={14}
                strokeWidth={2}
                style={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease',
                }}
              />
            </span>
            <span>
              {expanded ? '收起老师' : `展开其余 ${university.professors.length - desktopColumnCount} 位老师`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
