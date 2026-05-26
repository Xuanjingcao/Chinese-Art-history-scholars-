import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ChevronDown, MessageSquare, Star } from 'lucide-react';
import type { Professor, FilterRegion, Region } from '@/types';
import type { TitleFilter, SpecialtyFilter } from '@/sections/FilterBar';
import { getRating, submitRating, type RatingData } from '@/lib/ratings';
import {
  getDisplayTags,
  getStandardTagDefinition,
  hasCustomStandardTag,
} from '@/lib/standardTags';
import { getUniversityCountry, getUniversityNameParts } from '@/lib/universityNames';
import { getCommentCounts } from '@/lib/comments';
import { formatCommentCountBadge } from '@/lib/commentCountBadge';
import { compareUniversityNames, sortByUniversityName } from '@/lib/universitySorting';

const domesticRegionIds = ['huabei', 'huadong', 'huanan', 'zhongxibu', 'gangtai'];
const overseasRegionIds = ['north-america', 'europe', 'japan'];
const groupedOverseasRegionIds = ['north-america', 'europe'];

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s·•,，.。;；:：'"“”‘’()（）\-_/]/g, '');
}

function tokenizeLatinText(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isShortLatinQuery(value: string) {
  const trimmed = value.trim().toLowerCase();
  return /^[a-z]{1,3}$/.test(trimmed);
}

function isLatinQuery(value: string) {
  return /^[a-z]+$/.test(value.trim().toLowerCase());
}

function getCandidateMatchScore(query: string, candidate: string) {
  const trimmedQuery = query.trim().toLowerCase();
  const trimmedCandidate = candidate.trim();
  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const normalizedCandidate = normalizeSearchText(trimmedCandidate);

  if (!normalizedQuery || !normalizedCandidate) return 0;

  if (isShortLatinQuery(trimmedQuery)) {
    const tokens = tokenizeLatinText(trimmedCandidate);
    if (tokens.some((token) => token === normalizedQuery)) return 90;
    if (tokens.some((token) => token.startsWith(normalizedQuery))) return 76;
    return 0;
  }

  if (isLatinQuery(trimmedQuery)) {
    const tokens = tokenizeLatinText(trimmedCandidate);
    if (tokens.some((token) => token === normalizedQuery)) return 90;
    if (tokens.some((token) => token.startsWith(normalizedQuery))) return 82;
    if (tokens.some((token) => token.includes(normalizedQuery))) return 72;
    if (normalizedCandidate.startsWith(normalizedQuery)) return 64;
    if (normalizedQuery.length >= 4 && hasApproximateMatch(normalizedQuery, normalizedCandidate)) return 44;
    return 0;
  }

  if (normalizedCandidate === normalizedQuery) return 100;
  if (normalizedCandidate.startsWith(normalizedQuery)) return 92;
  if (normalizedCandidate.includes(normalizedQuery)) return 82;
  if (normalizedQuery.length >= 4 && hasApproximateMatch(normalizedQuery, normalizedCandidate)) return 48;
  return 0;
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

function getSearchScore(query: string, professor: Professor) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const nameScore = getCandidateMatchScore(query, professor.name);
  const englishNameScore = getCandidateMatchScore(query, professor.nameEn ?? '');
  const universityScore = getCandidateMatchScore(query, professor.university);
  const standardTagScore = Math.max(0, ...(professor.standardTags ?? []).map((tag) => getCandidateMatchScore(query, tag)));
  const specialtyScore = Math.max(0, ...professor.specialties.map((item) => getCandidateMatchScore(query, item)));
  const bioScore = normalizedQuery.length >= 3 ? getCandidateMatchScore(query, professor.bio) : 0;
  const achievementScore = normalizedQuery.length >= 3
    ? Math.max(0, ...professor.achievements.map((item) => getCandidateMatchScore(query, item)))
    : 0;
  const publicationScore = normalizedQuery.length >= 3
    ? Math.max(0, ...professor.publications.map((item) => getCandidateMatchScore(query, item)))
    : 0;

  return Math.max(
    nameScore * 12,
    englishNameScore * 11,
    universityScore * 10,
    standardTagScore * 8,
    specialtyScore * 7,
    bioScore * 4,
    achievementScore * 4,
    publicationScore * 4,
  );
}

function groupUniversitiesByCountry(region: Region) {
  if (!groupedOverseasRegionIds.includes(region.id)) return null;

  const grouped = new Map<string, Region['universities']>();

  region.universities.forEach((university) => {
    const country = university.country || getUniversityCountry(university.name);
    const list = grouped.get(country) ?? [];
    list.push(university);
    grouped.set(country, list);
  });

  return Array.from(grouped.entries()).map(([country, universities]) => ({
    country,
    universities: sortByUniversityName(universities, { preferEnglish: true }),
    professorCount: universities.reduce((sum, uni) => sum + uni.professors.length, 0),
  }));
}

function getCardUniversityName(name: string) {
  return getUniversityNameParts(name).nameZh;
}

const professorNameCollator = new Intl.Collator('zh-Hans-u-co-pinyin', {
  sensitivity: 'base',
  numeric: true,
});

function sortProfessorsByNamePinyin(professors: Professor[]) {
  return [...professors].sort((a, b) => {
    const byName = professorNameCollator.compare(a.name, b.name);
    if (byName !== 0) return byName;
    return professorNameCollator.compare(a.nameEn ?? '', b.nameEn ?? '');
  });
}

function getMobileCardTagLimit(tags: string[]) {
  if (tags.length <= 2) return tags.length;

  const firstThree = tags.slice(0, 3);
  const totalLength = firstThree.reduce((sum, tag) => sum + tag.length, 0);

  return totalLength <= 14 ? 3 : 2;
}

function CommentActionBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  const label = formatCommentCountBadge(count);

  return (
    <span
      className={compact
        ? 'relative inline-flex h-7 w-7 items-center justify-center rounded-full'
        : 'relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-serif text-sm'}
      style={{
        backgroundColor: 'rgba(92, 64, 48, 0.07)',
        color: '#6a5544',
        border: '1px solid rgba(92, 64, 48, 0.10)',
        boxShadow: '0 2px 6px rgba(60, 32, 22, 0.06)',
      }}
      aria-label={label ? `查看评价，${label}条评论` : '查看评价'}
    >
      <span className="relative inline-flex">
        <MessageSquare size={compact ? 14 : 15} strokeWidth={1.7} />
        {label ? (
          <span
            className="absolute -right-2.5 -top-2.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none"
            style={{
              backgroundColor: '#b06b4f',
              color: '#fff8ec',
              boxShadow: '0 1px 4px rgba(96, 54, 36, 0.22)',
              border: '1px solid rgba(255, 248, 236, 0.78)',
            }}
          >
            {label}
          </span>
        ) : null}
      </span>
      {compact ? null : <span>评价</span>}
    </span>
  );
}

interface ProfessorListProps {
  regions: Region[];
  filter: FilterRegion;
  searchQuery: string;
  titleFilter: TitleFilter;
  specialtyFilter: SpecialtyFilter;
  subRegion: string;
  onProfessorClick: (professor: Professor) => void;
}

function InteractiveRating({ professorId, compact = false }: { professorId: string; compact?: boolean }) {
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
      className={`flex items-center ${compact ? 'flex-nowrap gap-1.5 text-[11px]' : 'gap-2 text-sm'} font-serif`}
      style={{ color: '#8a7d6e' }}
      onClick={(event) => event.stopPropagation()}
      onMouseLeave={() => {
        setHoverScore(0);
        setIsInteracting(false);
      }}
    >
      <span className={`flex items-center ${compact ? 'gap-0' : 'gap-0.5'} shrink-0`} aria-label="学者评分">
        {Array.from({ length: 5 }).map((_, index) => {
          const fillRatio = Math.max(0, Math.min(1, displayScore - index));
          return (
            <button
              key={index}
              type="button"
              className={`relative cursor-pointer p-0 transition-transform hover:scale-105 disabled:cursor-wait ${compact ? 'h-4 w-4' : 'h-5 w-5'}`}
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
                size={compact ? 16 : 20}
                strokeWidth={1.25}
                style={{ color: '#b8ad9b', position: 'absolute', inset: 0 }}
              />
              <span
                className={`absolute left-0 top-0 overflow-hidden ${compact ? 'h-4' : 'h-5'}`}
                style={{ width: `${fillRatio * 100}%`, color: '#c89413' }}
              >
                <Star size={compact ? 16 : 20} strokeWidth={1.25} fill="currentColor" />
              </span>
            </button>
          );
        })}
      </span>
      {rating.count > 0 ? (
        <span className="shrink-0 whitespace-nowrap">{rating.average.toFixed(1)} · {rating.count}人</span>
      ) : (
        <span className="shrink-0 whitespace-nowrap">未评分</span>
      )}
    </div>
  );
}

export default function ProfessorList({
  regions,
  filter,
  searchQuery,
  titleFilter,
  specialtyFilter,
  subRegion,
  onProfessorClick,
}: ProfessorListProps) {
  const hasActiveSearch = searchQuery.trim().length > 0;
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

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
    const scoreByProfessorId = new Map<string, number>();

    // 1. Text search
    if (q) {
      data = data.map(region => ({
        ...region,
        universities: region.universities.map(uni => ({
          ...uni,
          professors: uni.professors.filter(p => {
            const matchScore = getSearchScore(q, p);
            scoreByProfessorId.set(p.id, matchScore);
            return matchScore > 0;
          }),
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
      if (specialtyFilter === 'other') {
        data = data.map(region => ({
          ...region,
          universities: region.universities.map(uni => ({
            ...uni,
            professors: uni.professors.filter((p) => hasCustomStandardTag(p.standardTags)),
          })).filter(u => u.professors.length > 0),
        })).filter(r => r.universities.length > 0);
      } else {
        const tagDefinition = getStandardTagDefinition(specialtyFilter);
        if (tagDefinition) {
          data = data.map(region => ({
            ...region,
            universities: region.universities.map(uni => ({
              ...uni,
              professors: uni.professors.filter((p) => (p.standardTags ?? []).includes(tagDefinition.label)),
            })).filter(u => u.professors.length > 0),
          })).filter(r => r.universities.length > 0);
        }
      }
    }

    if (!q) {
      return { regions: data, scoreByProfessorId };
    }

    return {
      regions: data.map((region) => ({
        ...region,
        universities: region.universities
          .map((uni) => ({
            ...uni,
            professors: [...uni.professors].sort((a, b) => {
              const scoreDiff = (scoreByProfessorId.get(b.id) ?? 0) - (scoreByProfessorId.get(a.id) ?? 0);
              if (scoreDiff !== 0) return scoreDiff;
              return professorNameCollator.compare(a.name, b.name);
            }),
          }))
          .sort((a, b) => {
            const aTopScore = Math.max(...a.professors.map((prof) => scoreByProfessorId.get(prof.id) ?? 0));
            const bTopScore = Math.max(...b.professors.map((prof) => scoreByProfessorId.get(prof.id) ?? 0));
            if (bTopScore !== aTopScore) return bTopScore - aTopScore;
            return compareUniversityNames(a.name, b.name);
          }),
      })),
      scoreByProfessorId,
    };
  }, [filter, searchQuery, titleFilter, specialtyFilter, subRegion]);

  const filteredRegions = filtered.regions;
  const searchScoreMap = filtered.scoreByProfessorId;

  const filteredProfessorIds = useMemo(() => {
    return Array.from(new Set(
      filteredRegions.flatMap((region) => (
        region.universities.flatMap((university) => (
          university.professors.map((professor) => professor.id)
        ))
      )),
    ));
  }, [filteredRegions]);

  useEffect(() => {
    let cancelled = false;

    getCommentCounts(filteredProfessorIds).then((counts) => {
      if (!cancelled) {
        setCommentCounts(counts);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filteredProfessorIds]);

  const displayRegions = useMemo(() => {
    const shouldMergeChina = (filter === 'all' || filter === 'china') && subRegion === 'all';
    if (!shouldMergeChina) return filteredRegions;

    const domesticRegions = filteredRegions.filter(region => domesticRegionIds.includes(region.id));
    const otherRegions = filteredRegions.filter(region => !domesticRegionIds.includes(region.id));

    if (domesticRegions.length === 0) return otherRegions;

    const chinaRegion: Region = {
      id: 'china',
      glyph: '中',
      name: '中国',
      nameEn: 'China',
      count: domesticRegions.reduce((sum, region) => sum + region.count, 0),
      universities: sortByUniversityName(domesticRegions.flatMap(region => region.universities)),
    };

    return [chinaRegion, ...otherRegions];
  }, [filter, filteredRegions, subRegion]);

  const chinaSubRegions = useMemo(
    () => filteredRegions.filter((region) => domesticRegionIds.includes(region.id)),
    [filteredRegions],
  );

  const searchUniversities = useMemo(
    () => {
      const universities = filteredRegions.flatMap((region) => region.universities);

      if (!hasActiveSearch) {
        return universities;
      }

      return [...universities].sort((a, b) => {
        const aTopScore = Math.max(...a.professors.map((prof) => searchScoreMap.get(prof.id) ?? 0));
        const bTopScore = Math.max(...b.professors.map((prof) => searchScoreMap.get(prof.id) ?? 0));
        if (bTopScore !== aTopScore) return bTopScore - aTopScore;
        return compareUniversityNames(a.name, b.name);
      });
    },
    [filteredRegions, hasActiveSearch, searchScoreMap],
  );

  return (
    <section className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-8 pt-4 pb-8">
      {/* Result count */}
      <div className="flex items-center justify-between mb-5">
        <span className="font-kai text-base" style={{ color: '#8a7d6e' }}>
          搜索结果
        </span>
      </div>

      <p
        className="mb-4 font-kai text-[11px] font-medium md:text-xs"
        style={{
          color: '#a49584',
        }}
      >
        国内学校按中文拼音排列，海外学校按英文首字母排列；各学校内老师按姓名拼音顺序排列
      </p>

      {/* Results */}
      {filteredRegions.length === 0 ? (
        <p className="font-kai text-sm text-center py-12" style={{ color: '#8a7d6e' }}>
          未找到匹配的学者，请调整筛选条件
        </p>
      ) : hasActiveSearch ? (
        <div className="space-y-7">
          {searchUniversities.map((uni) => (
            <UniversitySection
              key={`${uni.name}-${uni.professors.map((professor) => professor.id).join('-')}`}
              university={uni}
              forceExpanded
              searchScoreMap={searchScoreMap}
              getTitleMeta={getTitleMeta}
              commentCounts={commentCounts}
              onProfessorClick={onProfessorClick}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {displayRegions.map(region => (
            <RegionSection
              key={region.id}
              region={region}
              domesticSubRegions={region.id === 'china' ? chinaSubRegions : undefined}
              forceExpanded={hasActiveSearch}
              searchScoreMap={searchScoreMap}
              getTitleMeta={getTitleMeta}
              commentCounts={commentCounts}
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
  domesticSubRegions,
  forceExpanded,
  searchScoreMap,
  getTitleMeta,
  commentCounts,
  onProfessorClick,
}: {
  region: Region;
  domesticSubRegions?: Region[];
  forceExpanded?: boolean;
  searchScoreMap?: Map<string, number>;
  getTitleMeta: (title: Professor['title']) => { label: string; background: string; color: string };
  commentCounts: Record<string, number>;
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
      const updateCollapsed = setTimeout(() => setCollapsed(!forceExpanded), 0);
      return () => clearTimeout(updateCollapsed);
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
          {domesticSubRegions && domesticSubRegions.length > 0 ? (
            domesticSubRegions.map((subRegion) => (
              <SubRegionSection
                key={`china-${subRegion.id}`}
                subRegion={subRegion}
                forceExpanded={forceExpanded}
                searchScoreMap={searchScoreMap}
                getTitleMeta={getTitleMeta}
                commentCounts={commentCounts}
                onProfessorClick={onProfessorClick}
              />
            ))
          ) : countryGroups ? (
            countryGroups.map(group => (
              <CountrySection
                key={`${region.id}-${group.country}`}
                regionId={region.id}
                country={group.country}
                professorCount={group.professorCount}
                universities={group.universities}
                forceExpanded={forceExpanded}
                searchScoreMap={searchScoreMap}
                getTitleMeta={getTitleMeta}
                commentCounts={commentCounts}
                onProfessorClick={onProfessorClick}
              />
            ))
          ) : (
            region.universities.map(uni => (
              <UniversitySection
                key={uni.name}
                university={uni}
                forceExpanded={forceExpanded}
                searchScoreMap={searchScoreMap}
                getTitleMeta={getTitleMeta}
                commentCounts={commentCounts}
                onProfessorClick={onProfessorClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SubRegionSection({
  subRegion,
  forceExpanded,
  searchScoreMap,
  getTitleMeta,
  commentCounts,
  onProfessorClick,
}: {
  subRegion: Region;
  forceExpanded?: boolean;
  searchScoreMap?: Map<string, number>;
  getTitleMeta: (title: Professor['title']) => { label: string; background: string; color: string };
  commentCounts: Record<string, number>;
  onProfessorClick: (professor: Professor) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hasInitializedViewport = useRef(false);
  const previousIsMobile = useRef(false);
  const sectionId = `subregion-section-${subRegion.id}`;

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
      const updateCollapsed = setTimeout(() => setCollapsed(!forceExpanded), 0);
      return () => clearTimeout(updateCollapsed);
    }
  }, [forceExpanded, isMobile]);

  return (
    <div className="space-y-5">
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
        aria-controls={sectionId}
      >
        <h3 className="font-kai text-lg font-medium md:text-2xl md:font-semibold" style={{ color: '#2c2118', letterSpacing: '0.02em' }}>
          {subRegion.name}
        </h3>
        <span
          className="rounded-full px-2.5 py-1 font-serif text-sm"
          style={{
            backgroundColor: 'rgba(92, 64, 48, 0.08)',
            color: '#6a5544',
            border: '1px solid rgba(92, 64, 48, 0.10)',
          }}
        >
          {subRegion.count}人
        </span>
        <ChevronDown
          size={20}
          strokeWidth={1.7}
          className="transition-transform duration-200"
          style={{
            color: '#7a6653',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        />
        <div className="h-px flex-1" style={{ backgroundColor: 'rgba(92, 64, 48, 0.18)' }} />
      </button>

      {!collapsed && (
        <div id={sectionId} className="space-y-7">
          {subRegion.universities.map((uni) => (
            <UniversitySection
              key={`${subRegion.id}-${uni.name}`}
              university={uni}
              forceExpanded={forceExpanded}
              searchScoreMap={searchScoreMap}
              getTitleMeta={getTitleMeta}
              commentCounts={commentCounts}
              onProfessorClick={onProfessorClick}
            />
          ))}
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
  searchScoreMap,
  getTitleMeta,
  commentCounts,
  onProfessorClick,
}: {
  regionId: string;
  country: string;
  professorCount: number;
  universities: Region['universities'];
  forceExpanded?: boolean;
  searchScoreMap?: Map<string, number>;
  getTitleMeta: (title: Professor['title']) => { label: string; background: string; color: string };
  commentCounts: Record<string, number>;
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
      const updateCollapsed = setTimeout(() => setCollapsed(!forceExpanded), 0);
      return () => clearTimeout(updateCollapsed);
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
              searchScoreMap={searchScoreMap}
              getTitleMeta={getTitleMeta}
              commentCounts={commentCounts}
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
  searchScoreMap,
  getTitleMeta,
  commentCounts,
  onProfessorClick,
}: {
  university: Region['universities'][number];
  forceExpanded?: boolean;
  searchScoreMap?: Map<string, number>;
  getTitleMeta: (title: Professor['title']) => { label: string; background: string; color: string };
  commentCounts: Record<string, number>;
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
      const updateMobileSection = setTimeout(() => setMobileSectionOpen(Boolean(forceExpanded)), 0);
      return () => clearTimeout(updateMobileSection);
    }
  }, [forceExpanded, isMobile]);

  const sortedProfessors = useMemo(() => {
    if (!searchScoreMap || searchScoreMap.size === 0) {
      return sortProfessorsByNamePinyin(university.professors);
    }

    return [...university.professors].sort((a, b) => {
      const scoreDiff = (searchScoreMap.get(b.id) ?? 0) - (searchScoreMap.get(a.id) ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return professorNameCollator.compare(a.name, b.name);
    });
  }, [searchScoreMap, university.professors]);
  const canCollapse = desktopColumnCount !== null && sortedProfessors.length > desktopColumnCount;
  const visibleProfessors = isMobile
    ? sortedProfessors
    : canCollapse && !expanded
      ? sortedProfessors.slice(0, desktopColumnCount)
      : sortedProfessors;
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
              {sortedProfessors.length} 位老师
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
                    const allDisplayTags = getDisplayTags(prof.standardTags, prof.specialties, 6);
                    const mobileTagLimit = getMobileCardTagLimit(allDisplayTags);
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
                          <CommentActionBadge count={commentCounts[prof.id] ?? 0} compact />
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

                        <div className="flex max-h-[56px] flex-wrap content-start items-start gap-1 overflow-hidden">
                        {allDisplayTags.slice(0, mobileTagLimit).map((s, i) => (
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

                        <div className="origin-left">
                          <InteractiveRating professorId={prof.id} compact />
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
            <div className="min-w-0">
              <h3
                className="min-w-0 break-words font-kai text-xl font-semibold md:text-3xl"
                style={{ color: '#221a13', letterSpacing: '0.02em' }}
              >
                {nameZh}
              </h3>
              {nameEn ? (
                <p
                  className="mt-1 break-words font-serif text-sm leading-[1.35] md:text-base"
                  style={{ color: '#6b5b4b' }}
                >
                  {nameEn}
                </p>
              ) : null}
            </div>
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
                        <CommentActionBadge count={commentCounts[prof.id] ?? 0} />
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

                      <div className="flex max-h-[72px] flex-wrap content-start items-start gap-1.5 overflow-hidden">
                        {getDisplayTags(prof.standardTags, prof.specialties, 6).map((s, i) => (
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
              {expanded ? '收起老师' : `展开其余 ${sortedProfessors.length - desktopColumnCount} 位老师`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
