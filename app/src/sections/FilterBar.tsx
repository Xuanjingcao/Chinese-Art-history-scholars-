import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { specialtyCategories } from '@/data/professors';
import type { FilterRegion } from '@/types';

export type TitleFilter = 'all' | 'professor' | 'associate' | 'assistant' | 'lecturer';
export type InstitutionFilter = 'all' | 'domestic' | 'overseas';
export type SpecialtyFilter = string;

const regionTabs: { key: FilterRegion; label: string }[] = [
  { key: 'all', label: '全部地区' },
  { key: 'china', label: '中国' },
  { key: 'overseas', label: '海外' },
];

const subRegionTabs: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'huabei', label: '华北' },
  { key: 'huadong', label: '华东' },
  { key: 'huanan', label: '华南' },
  { key: 'zhongxibu', label: '中西部' },
  { key: 'gangtai', label: '港台' },
];

const titleTabs: { key: TitleFilter; label: string }[] = [
  { key: 'all', label: '全部职称' },
  { key: 'professor', label: '教授' },
  { key: 'associate', label: '副教授' },
  { key: 'assistant', label: '助理教授' },
  { key: 'lecturer', label: '讲师' },
];

const institutionTabs: { key: InstitutionFilter; label: string }[] = [
  { key: 'all', label: '全部院校' },
  { key: 'domestic', label: '国内高校' },
  { key: 'overseas', label: '海外高校' },
];

const specialtyTabs = [
  { key: 'all', label: '全部方向' },
  ...specialtyCategories.map(c => ({ key: c.key, label: c.label })),
];

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  regionFilter: FilterRegion;
  onRegionFilterChange: (r: FilterRegion) => void;
  subRegionFilter: string;
  onSubRegionFilterChange: (s: string) => void;
  titleFilter: TitleFilter;
  onTitleFilterChange: (t: TitleFilter) => void;
  institutionFilter: InstitutionFilter;
  onInstitutionFilterChange: (i: InstitutionFilter) => void;
  specialtyFilter: SpecialtyFilter;
  onSpecialtyFilterChange: (s: SpecialtyFilter) => void;
  activeFilterCount: number;
}

function FilterRow({
  label,
  tabs,
  active,
  onChange,
}: {
  label: string;
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className="shrink-0 mr-2 text-right"
        style={{
          color: '#8a7d6e',
          fontSize: '13px',
          fontFamily: 'var(--font-kai)',
          width: '32px',
        }}
      >
        {label}
      </span>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="transition-all duration-200"
          style={{
            fontFamily: 'var(--font-kai)',
            fontSize: '13px',
            padding: '3px 12px',
            borderRadius: '6px',
            backgroundColor: active === t.key ? 'rgba(92, 64, 48, 0.08)' : 'transparent',
            color: active === t.key ? '#5c4030' : '#8a7d6e',
            border: active === t.key
              ? '1px solid rgba(92, 64, 48, 0.25)'
              : '1px solid rgba(138, 125, 110, 0.18)',
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  regionFilter,
  onRegionFilterChange,
  subRegionFilter,
  onSubRegionFilterChange,
  titleFilter,
  onTitleFilterChange,
  institutionFilter,
  onInstitutionFilterChange,
  specialtyFilter,
  onSpecialtyFilterChange,
  activeFilterCount,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(true);

  const handleClearAll = () => {
    onSearchChange('');
    onRegionFilterChange('all');
    onSubRegionFilterChange('all');
    onTitleFilterChange('all');
    onInstitutionFilterChange('all');
    onSpecialtyFilterChange('all');
  };

  return (
    <div
      className="w-full"
      style={{
        backgroundColor: 'rgba(250, 247, 240, 0.85)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
        {/* ─── Search Box Row (full-width, large, rounded) ─── */}
        <div className="flex items-center gap-3">
          {/* Search input - large, rounded, full-width */}
          <div
            className="flex-1 flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              borderRadius: '12px',
              border: '1px solid rgba(138, 125, 110, 0.2)',
              padding: '10px 16px',
            }}
          >
            <Search
              size={20}
              strokeWidth={1.5}
              style={{ color: '#8a7d6e', flexShrink: 0 }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索姓名、院校、研究方向..."
              className="outline-none bg-transparent flex-1 min-w-0"
              style={{
                fontFamily: 'var(--font-kai)',
                fontSize: '15px',
                color: 'var(--ink)',
                letterSpacing: '0.02em',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="shrink-0 transition-opacity hover:opacity-60"
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(138, 125, 110, 0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title="清除"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <line x1="1" y1="1" x2="13" y2="13" stroke="#8a7d6e" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="13" y1="1" x2="1" y2="13" stroke="#8a7d6e" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0 flex items-center gap-1.5 transition-all hover:opacity-80"
            style={{
              fontFamily: 'var(--font-kai)',
              fontSize: '14px',
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor:
                activeFilterCount > 0
                  ? 'rgba(92, 64, 48, 0.1)'
                  : 'rgba(255, 255, 255, 0.6)',
              color: activeFilterCount > 0 ? '#5c4030' : '#8a7d6e',
              border: '1px solid rgba(138, 125, 110, 0.2)',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">
              {activeFilterCount > 0 ? '清空筛选' : '筛选'}
            </span>
            {activeFilterCount > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: '#5c4030',
                  color: '#f5f0e8',
                  width: '18px',
                  height: '18px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-serif)',
                  marginLeft: '2px',
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ─── Filter Rows ─── */}
        {showFilters && (
          <div className="mt-4 space-y-2.5">
            {/* Region */}
            <FilterRow
              label="地区"
              tabs={regionTabs}
              active={regionFilter}
              onChange={(k) => {
                onRegionFilterChange(k as FilterRegion);
                onSubRegionFilterChange('all');
              }}
            />
            {/* Sub-region */}
            {regionFilter === 'china' && (
              <FilterRow
                label="子地区"
                tabs={subRegionTabs}
                active={subRegionFilter}
                onChange={(k) => onSubRegionFilterChange(k)}
              />
            )}
            {/* Title */}
            <FilterRow
              label="职称"
              tabs={titleTabs}
              active={titleFilter}
              onChange={(k) => onTitleFilterChange(k as TitleFilter)}
            />
            {/* Institution */}
            <FilterRow
              label="院校"
              tabs={institutionTabs}
              active={institutionFilter}
              onChange={(k) => onInstitutionFilterChange(k as InstitutionFilter)}
            />
            {/* Specialty */}
            <FilterRow
              label="方向"
              tabs={specialtyTabs}
              active={specialtyFilter}
              onChange={(k) => onSpecialtyFilterChange(k)}
            />

            {/* Active filter tags + clear all */}
            {activeFilterCount > 0 && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleClearAll}
                  className="transition-opacity hover:opacity-60"
                  style={{
                    fontFamily: 'var(--font-kai)',
                    fontSize: '12px',
                    color: '#b03530',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  清除全部筛选
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'rgba(30, 24, 16, 0.06)',
        }}
      />
    </div>
  );
}
