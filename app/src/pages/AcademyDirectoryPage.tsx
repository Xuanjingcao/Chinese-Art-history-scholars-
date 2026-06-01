import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Globe2,
  Link2,
  Search,
  UsersRound,
} from 'lucide-react';
import {
  buildAcademyDirectory,
  getAcademySubregionOptions,
  matchesAcademyQuery,
  matchesAcademySubregion,
  type AcademyDirectoryEntry,
  type AcademyRegionGroup,
} from '@/lib/academyDirectory';
import type { Region } from '@/types';
import { loadAcademyConfig, staticAcademyConfig } from '@/data/academies';

type AcademyFilter = 'all' | AcademyRegionGroup;

const regionTabs: { key: AcademyFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'china', label: '中国' },
  { key: 'japan', label: '日本' },
  { key: 'north-america', label: '北美' },
  { key: 'europe', label: '欧洲' },
];

const regionLabels: Record<AcademyRegionGroup, string> = {
  china: '中国院校',
  japan: '日本院校',
  'north-america': '北美院校',
  europe: '欧洲院校',
};

function AcademyCard({
  school,
}: {
  school: AcademyDirectoryEntry;
}) {
  return (
    <article
      className="rounded-[18px] px-4 py-4 md:px-5 md:py-5"
      style={{
        background: 'linear-gradient(135deg, rgba(253,250,243,0.92), rgba(241,233,216,0.82))',
        border: '1px solid rgba(139, 120, 87, 0.17)',
        boxShadow: '0 8px 20px rgba(56, 44, 30, 0.055)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-kai text-[20px] leading-tight md:text-[22px]" style={{ color: '#2f251b' }}>
            {school.nameZh || school.nameEn}
          </h3>
          {school.nameZh && school.nameEn && (
            <p className="mt-1 truncate font-roman-display text-[14px] italic" style={{ color: '#8c7964' }}>
              {school.nameEn}
            </p>
          )}
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-kai text-[11px]"
          style={{
            color: '#6c7959',
            backgroundColor: 'rgba(102,118,83,0.09)',
            border: '1px solid rgba(102,118,83,0.14)',
          }}
        >
          <UsersRound size={12} strokeWidth={1.7} />
          {school.scholarCount} 位学者
        </span>
      </div>

      <div className="my-3 h-px" style={{ backgroundColor: 'rgba(92,64,48,0.1)' }} />

      {school.academies.length > 0 ? (
        <div className="space-y-2.5">
          {school.academies.map((academy) => (
            <div key={academy.url} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 font-kai text-[14px]" style={{ color: '#655342' }}>
                <Building2 className="shrink-0" size={15} strokeWidth={1.65} />
                <span className="truncate">{academy.label}</span>
              </span>
              <a
                href={academy.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 font-kai text-[12px] transition-opacity hover:opacity-75"
                style={{
                  color: '#fffdf7',
                  backgroundColor: '#687756',
                  border: '1px solid rgba(77,92,61,0.42)',
                }}
              >
                进入官网
                <ExternalLink size={12} strokeWidth={1.8} />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex min-w-0 items-center gap-2 font-kai text-[13px]" style={{ color: '#9b8d7c' }}>
            <Link2 className="shrink-0" size={15} strokeWidth={1.65} />
            学院官网待补充
          </span>
        </div>
      )}
    </article>
  );
}

export default function AcademyDirectoryPage({
  regions,
  schoolCoverageCount,
  countryCoverageCount,
  onBack,
}: {
  regions: Region[];
  schoolCoverageCount: number;
  countryCoverageCount: number;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<AcademyFilter>('all');
  const [subregionFilter, setSubregionFilter] = useState('all');
  const [academyConfig, setAcademyConfig] = useState(staticAcademyConfig);
  const deferredQuery = useDeferredValue(query);
  const directory = useMemo(() => buildAcademyDirectory(regions, academyConfig), [academyConfig, regions]);
  const directoryCountryCount = useMemo(
    () => new Set(directory.map((school) => school.country).filter(Boolean)).size,
    [directory],
  );

  useEffect(() => {
    let cancelled = false;

    loadAcademyConfig().then((config) => {
      if (!cancelled) setAcademyConfig(config);
    });

    return () => {
      cancelled = true;
    };
  }, []);
  const subregionOptions = useMemo(() => {
    if (regionFilter === 'all' || regionFilter === 'japan') return [];
    return getAcademySubregionOptions(directory, regionFilter);
  }, [directory, regionFilter]);
  const visibleSchools = useMemo(() => {
    return directory.filter((school) => {
      const regionMatches = regionFilter === 'all' || school.regionGroup === regionFilter;
      return regionMatches
        && matchesAcademySubregion(school, subregionFilter)
        && matchesAcademyQuery(school, deferredQuery);
    });
  }, [deferredQuery, directory, regionFilter, subregionFilter]);

  const groupedSchools = useMemo(() => {
    return regionTabs
      .filter((tab) => tab.key !== 'all')
      .map((tab) => ({
        key: tab.key as AcademyRegionGroup,
        schools: visibleSchools.filter((school) => school.regionGroup === tab.key),
      }))
      .filter((group) => group.schools.length > 0);
  }, [visibleSchools]);

  return (
    <main className="mx-auto min-h-[calc(100vh-72px)] max-w-[920px] px-3 pb-5 pt-4 md:px-6 md:pb-10 md:pt-8">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ color: '#5c4030', backgroundColor: 'rgba(252,248,240,0.76)', border: '1px solid rgba(92,64,48,0.14)' }}
          aria-label="返回首页"
        >
          <ArrowLeft size={18} strokeWidth={1.7} />
        </button>
        <h1 className="font-kai text-[22px] md:text-[28px]" style={{ color: '#34271c', letterSpacing: '0.08em' }}>
          院校与学院
        </h1>
        <span className="h-10 w-10" aria-hidden="true" />
      </div>

      <section
        className="rounded-[20px] px-4 py-5 md:px-6 md:py-6"
        style={{
          background: 'linear-gradient(140deg, rgba(252,248,240,0.9), rgba(236,228,210,0.74))',
          border: '1px solid rgba(139,120,87,0.18)',
          boxShadow: '0 12px 28px rgba(56,44,30,0.07)',
        }}
      >
        <h2 className="font-kai text-[22px] md:text-[28px]" style={{ color: '#34271c' }}>
          查找院校及相关学院官网
        </h2>
        <p className="mt-2 font-kai text-[13px] leading-6 md:text-[15px]" style={{ color: '#826f5c' }}>
          按地区浏览院校，直达艺术史相关学院或系所官网。
        </p>

        <span
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-kai text-[12px]"
          style={{ color: '#687756', backgroundColor: 'rgba(102,118,83,0.1)', border: '1px solid rgba(102,118,83,0.16)' }}
        >
          <Globe2 size={13} strokeWidth={1.7} />
          公开官网导航
        </span>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { value: Math.max(schoolCoverageCount, directory.length), label: '所院校' },
            { value: Math.max(countryCoverageCount, directoryCountryCount), label: '个国家和地区' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl px-3 py-3 text-center"
              style={{ backgroundColor: 'rgba(255,253,248,0.62)', border: '1px solid rgba(139,120,87,0.12)' }}
            >
              <strong className="font-title text-[24px] font-semibold" style={{ color: '#34271c' }}>{stat.value}</strong>
              <span className="ml-1.5 font-kai text-[12px]" style={{ color: '#8a7d6e' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <label
        className="mt-4 flex items-center gap-2 rounded-[15px] px-4 py-3"
        style={{ backgroundColor: 'rgba(253,250,243,0.88)', border: '1px solid rgba(139,120,87,0.18)' }}
      >
        <Search size={18} strokeWidth={1.7} style={{ color: '#71805f' }} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索院校或学院名称"
          className="min-w-0 flex-1 bg-transparent font-kai text-[15px] outline-none placeholder:text-[#ad9e8d]"
          style={{ color: '#34271c' }}
        />
      </label>

      <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
        {regionTabs.map((tab) => {
          const active = tab.key === regionFilter;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setRegionFilter(tab.key);
                setSubregionFilter('all');
              }}
              className="shrink-0 rounded-full px-4 py-2 font-kai text-[13px] transition-colors"
              style={{
                color: active ? '#fffdf7' : '#756350',
                backgroundColor: active ? '#687756' : 'rgba(253,250,243,0.72)',
                border: active ? '1px solid rgba(77,92,61,0.52)' : '1px solid rgba(139,120,87,0.16)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {subregionOptions.length > 0 && (
        <div className="mt-3 rounded-[14px] px-3 py-3" style={{ backgroundColor: 'rgba(252,248,240,0.54)' }}>
          <p className="mb-2 px-1 font-kai text-[12px]" style={{ color: '#978674' }}>
            细分地区
          </p>
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-0.5">
            {subregionOptions.map((option) => {
              const active = option.key === subregionFilter;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSubregionFilter(option.key)}
                  className="shrink-0 rounded-full px-3.5 py-1.5 font-kai text-[12px] transition-colors"
                  style={{
                    color: active ? '#5f704d' : '#897763',
                    backgroundColor: active ? 'rgba(102,118,83,0.13)' : 'rgba(255,253,248,0.66)',
                    border: active ? '1px solid rgba(102,118,83,0.26)' : '1px solid rgba(139,120,87,0.12)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-6">
        {groupedSchools.length > 0 ? (
          groupedSchools.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-end justify-between px-1">
                <h2 className="font-kai text-[20px]" style={{ color: '#3d3024', letterSpacing: '0.06em' }}>
                  {regionLabels[group.key]}
                </h2>
                <span className="font-kai text-[12px]" style={{ color: '#978674' }}>
                  {group.schools.length} 所院校
                </span>
              </div>
              <div className="space-y-3">
                {group.schools.map((school) => (
                  <AcademyCard key={school.key} school={school} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div
            className="rounded-[18px] px-5 py-10 text-center"
            style={{ backgroundColor: 'rgba(252,248,240,0.74)', border: '1px solid rgba(139,120,87,0.16)' }}
          >
            <p className="font-kai text-[16px]" style={{ color: '#756350' }}>暂未找到相关院校</p>
            <p className="mt-2 font-kai text-[13px]" style={{ color: '#a09180' }}>可以尝试更换关键词或地区。</p>
          </div>
        )}
      </div>
    </main>
  );
}
