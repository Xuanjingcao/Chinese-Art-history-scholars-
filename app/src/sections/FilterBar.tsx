import { useState } from 'react';
import { Building2, Compass, GraduationCap, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

const overseasRegionTabs: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'north-america', label: '北美' },
  { key: 'europe', label: '欧洲' },
  { key: 'japan', label: '日本' },
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
  icon: Icon,
  tabs,
  active,
  onChange,
}: {
  label: string;
  icon: LucideIcon;
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsedLimit = 4;
  const hasOverflow = tabs.length > 6;
  const activeTab = tabs.find((t) => t.key === active);
  const firstTabs = tabs.slice(0, collapsedLimit);
  const mobileTabs = expanded || !hasOverflow
    ? tabs
    : activeTab && !firstTabs.some((t) => t.key === activeTab.key)
      ? [...tabs.slice(0, collapsedLimit - 1), activeTab]
      : firstTabs;

  const renderOption = (t: { key: string; label: string }) => (
    <button
      key={t.key}
      onClick={() => onChange(t.key)}
      className="shrink-0 transition-all duration-200"
      style={{
        fontFamily: 'var(--font-kai)',
        fontSize: '15px',
        padding: '6px 15px',
        borderRadius: '8px',
        backgroundColor: active === t.key ? 'rgba(92, 64, 48, 0.11)' : 'rgba(255, 255, 255, 0.18)',
        color: active === t.key ? '#241810' : '#2f261f',
        border: active === t.key
          ? '1px solid rgba(92, 64, 48, 0.32)'
          : '1px solid rgba(92, 64, 48, 0.18)',
        cursor: 'pointer',
        letterSpacing: '0.02em',
      }}
    >
      {t.label}
    </button>
  );

  return (
    <div className="flex min-w-0 items-start gap-2 md:gap-3">
      <span
        className="flex shrink-0 items-center justify-end gap-1 pt-1.5 md:gap-1.5"
        style={{
          color: '#2f261f',
          fontSize: '14px',
          fontFamily: 'var(--font-kai)',
          width: '54px',
          whiteSpace: 'nowrap',
        }}
      >
        <Icon size={15} strokeWidth={1.8} />
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-2 md:hidden">
        {mobileTabs.map(renderOption)}
        {hasOverflow && (
          <button
            onClick={() => setExpanded((value) => !value)}
            className="shrink-0 transition-all duration-200"
            style={{
              fontFamily: 'var(--font-kai)',
              fontSize: '15px',
              padding: '6px 15px',
              borderRadius: '8px',
              backgroundColor: 'rgba(92, 64, 48, 0.08)',
              color: '#241810',
              border: '1px solid rgba(92, 64, 48, 0.22)',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>
      <div className="hidden min-w-0 flex-1 flex-wrap gap-2 md:flex">
        {tabs.map(renderOption)}
      </div>
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
      className="w-full min-w-0 px-3 md:px-6"
    >
      <div
        className="mx-auto max-w-[1280px] min-w-0 px-4 py-5 md:px-8"
        style={{
          backgroundColor: 'rgba(242, 235, 219, 0.90)',
          backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(164, 137, 96, 0.035))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(138, 125, 110, 0.16)',
          borderRadius: '18px',
          boxShadow: '0 10px 30px rgba(40, 32, 24, 0.08)',
        }}
      >
        {/* ─── Search Box Row (full-width, large, rounded) ─── */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Search input - large, rounded, full-width */}
          <div
            className="flex min-w-0 flex-1 items-center gap-2 md:gap-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              borderRadius: '12px',
              border: '1px solid rgba(138, 125, 110, 0.2)',
              padding: '13px 18px',
            }}
          >
            <Search
              size={20}
              strokeWidth={1.5}
              style={{ color: '#3a2e22', flexShrink: 0 }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索姓名、院校、研究方向..."
              className="outline-none bg-transparent flex-1 min-w-0"
              style={{
                fontFamily: 'var(--font-kai)',
                fontSize: '17px',
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
              fontSize: '16px',
              padding: '13px 18px',
              borderRadius: '10px',
              backgroundColor:
                activeFilterCount > 0
                  ? 'rgba(92, 64, 48, 0.1)'
                  : 'rgba(255, 255, 255, 0.6)',
              color: activeFilterCount > 0 ? '#241810' : '#2f261f',
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
          <div className="mt-5 space-y-3">
            {/* Region */}
            <FilterRow
              label="地区"
              icon={MapPin}
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
                icon={MapPin}
                tabs={subRegionTabs}
                active={subRegionFilter}
                onChange={(k) => onSubRegionFilterChange(k)}
              />
            )}
            {regionFilter === 'overseas' && (
              <FilterRow
                label="子地区"
                icon={MapPin}
                tabs={overseasRegionTabs}
                active={subRegionFilter}
                onChange={(k) => onSubRegionFilterChange(k)}
              />
            )}
            {/* Title */}
            <FilterRow
              label="职称"
              icon={GraduationCap}
              tabs={titleTabs}
              active={titleFilter}
              onChange={(k) => onTitleFilterChange(k as TitleFilter)}
            />
            {/* Institution */}
            <FilterRow
              label="院校"
              icon={Building2}
              tabs={institutionTabs}
              active={institutionFilter}
              onChange={(k) => onInstitutionFilterChange(k as InstitutionFilter)}
            />
            {/* Specialty */}
            <FilterRow
              label="方向"
              icon={Compass}
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

    </div>
  );
}
