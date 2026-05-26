import { useState } from 'react';
import { Compass, Funnel, GraduationCap, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { standardTagDefinitions } from '@/lib/standardTags';
import type { FilterRegion } from '@/types';

export type TitleFilter = 'all' | 'professor' | 'associate' | 'assistant' | 'lecturer';
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
  { key: 'japan', label: '日本' },
  { key: 'north-america', label: '北美' },
  { key: 'europe', label: '欧洲' },
];

const titleTabs: { key: TitleFilter; label: string }[] = [
  { key: 'all', label: '全部职称' },
  { key: 'professor', label: '教授' },
  { key: 'associate', label: '副教授' },
  { key: 'assistant', label: '助理教授' },
  { key: 'lecturer', label: '讲师' },
];

const specialtyTabs = [
  { key: 'all', label: '全部方向' },
  ...standardTagDefinitions.map((tag) => ({ key: tag.key, label: tag.label })),
  { key: 'other', label: '其他' },
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
  specialtyFilter: SpecialtyFilter;
  onSpecialtyFilterChange: (s: SpecialtyFilter) => void;
  activeFilterCount: number;
}

type FilterRowKey = 'region' | 'subRegion' | 'title' | 'specialty';

function FilterRow({
  label,
  icon: Icon,
  tabs,
  active,
  touched = false,
  onChange,
}: {
  label: string;
  icon: LucideIcon;
  tabs: { key: string; label: string }[];
  active: string;
  touched?: boolean;
  onChange: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsedLimit = 4;
  const hasOverflow = tabs.length > 6;
  const activeTab = tabs.find((t) => t.key === active);
  const firstTabs = tabs.slice(0, collapsedLimit);
  const isOptionActive = (key: string) => active === key && (key !== 'all' || touched);
  const mobileTabs = expanded || !hasOverflow
    ? tabs
    : activeTab && !firstTabs.some((t) => t.key === activeTab.key)
      ? [...tabs.slice(0, collapsedLimit - 1), activeTab]
      : firstTabs;

  const renderOption = (t: { key: string; label: string }) => (
    <button
      key={t.key}
      onClick={() => onChange(t.key)}
      className="shrink-0 text-[14px] font-medium transition-all duration-200 md:text-[15px] md:font-normal"
      style={{
        fontFamily: 'var(--font-kai)',
        padding: '6px 15px',
        borderRadius: '8px',
        backgroundColor: isOptionActive(t.key) ? 'rgba(92, 64, 48, 0.11)' : 'rgba(255, 255, 255, 0.18)',
        color: isOptionActive(t.key) ? '#241810' : '#2f261f',
        border: isOptionActive(t.key)
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
            className="shrink-0 text-[14px] font-medium transition-all duration-200 md:text-[15px] md:font-normal"
            style={{
              fontFamily: 'var(--font-kai)',
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
  specialtyFilter,
  onSpecialtyFilterChange,
  activeFilterCount,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [touchedRows, setTouchedRows] = useState<Record<FilterRowKey, boolean>>({
    region: false,
    subRegion: false,
    title: false,
    specialty: false,
  });

  const markRowTouched = (row: FilterRowKey) => {
    setTouchedRows((current) => current[row] ? current : { ...current, [row]: true });
  };

  const getNextFilterValue = (current: string, next: string) => {
    if (next === 'all') {
      return 'all';
    }

    return current === next ? 'all' : next;
  };

  const handleClearAll = () => {
    onSearchChange('');
    onRegionFilterChange('all');
    onSubRegionFilterChange('all');
    onTitleFilterChange('all');
    onSpecialtyFilterChange('all');
    setTouchedRows({
      region: true,
      subRegion: true,
      title: true,
      specialty: true,
    });
  };

  return (
    <div
      className="w-full min-w-0 px-3 md:px-6"
    >
      <div
        className="relative mx-auto max-w-[1280px] min-w-0 overflow-hidden px-3 py-3 md:px-6 md:py-4"
        style={{
          backgroundColor: 'rgba(252, 248, 240, 0.80)',
          backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(232, 219, 194, 0.18))',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(139, 120, 87, 0.14)',
          borderRadius: '14px',
          boxShadow: '0 8px 20px rgba(56, 44, 30, 0.07)',
        }}
      >
        {/* ─── Search Box Row (full-width, large, rounded) ─── */}
        <div
          className="relative z-10 flex min-w-0 items-center gap-0 overflow-hidden rounded-[14px]"
          style={{
            backgroundColor: 'rgba(255, 253, 248, 0.78)',
            border: '1px solid rgba(139, 120, 87, 0.24)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.76), 0 6px 16px rgba(56,44,30,0.05)',
          }}
        >
          {/* Search input - large, rounded, full-width */}
          <div
            className="flex min-w-0 flex-1 items-center gap-3 md:gap-4"
            style={{
              padding: '8px 10px 8px 12px',
            }}
          >
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-12 md:w-12"
              style={{
                color: '#6f7a58',
                background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.78), rgba(232,226,209,0.74))',
                border: '1px solid rgba(139, 120, 87, 0.14)',
              }}
              aria-hidden="true"
            >
              <Search className="h-[18px] w-[18px] md:h-[22px] md:w-[22px]" strokeWidth={1.7} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索姓名、院校、研究方向..."
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none md:text-[20px]"
              style={{
                fontFamily: 'var(--font-kai)',
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
            className="relative hidden shrink-0 items-center justify-center gap-2 self-stretch overflow-hidden px-5 text-[18px] font-normal transition-all hover:opacity-90 sm:flex md:px-7 md:text-[19px]"
            style={{
              fontFamily: 'var(--font-kai)',
              backgroundColor:
                activeFilterCount > 0
                  ? '#72805a'
                  : '#7b875f',
              color: '#fffdf6',
              borderLeft: '1px solid rgba(139, 120, 87, 0.22)',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              minHeight: '54px',
            }}
          >
            <Funnel size={22} strokeWidth={1.8} />
            <span>
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 sm:hidden"
            style={{
              color: activeFilterCount > 0 ? '#fffdf6' : '#5c4030',
              backgroundColor: activeFilterCount > 0 ? '#72805a' : 'rgba(92, 64, 48, 0.08)',
              border: '1px solid rgba(139, 120, 87, 0.16)',
              boxShadow: activeFilterCount > 0 ? '0 3px 8px rgba(72, 84, 55, 0.18)' : 'none',
              cursor: 'pointer',
            }}
            aria-label={activeFilterCount > 0 ? `筛选，${activeFilterCount}项已启用` : '筛选'}
          >
            <SlidersHorizontal size={16} strokeWidth={1.8} />
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
              touched={touchedRows.region}
              onChange={(k) => {
                markRowTouched('region');
                const nextRegion = getNextFilterValue(regionFilter, k) as FilterRegion;
                onRegionFilterChange(nextRegion);
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
                touched={touchedRows.subRegion}
                onChange={(k) => {
                  markRowTouched('subRegion');
                  onSubRegionFilterChange(getNextFilterValue(subRegionFilter, k));
                }}
              />
            )}
            {regionFilter === 'overseas' && (
              <FilterRow
                label="子地区"
                icon={MapPin}
                tabs={overseasRegionTabs}
                active={subRegionFilter}
                touched={touchedRows.subRegion}
                onChange={(k) => {
                  markRowTouched('subRegion');
                  onSubRegionFilterChange(getNextFilterValue(subRegionFilter, k));
                }}
              />
            )}
            {/* Title */}
            <FilterRow
              label="职称"
              icon={GraduationCap}
              tabs={titleTabs}
              active={titleFilter}
              touched={touchedRows.title}
              onChange={(k) => {
                markRowTouched('title');
                onTitleFilterChange(getNextFilterValue(titleFilter, k) as TitleFilter);
              }}
            />
            {/* Specialty */}
            <FilterRow
              label="方向"
              icon={Compass}
              tabs={specialtyTabs}
              active={specialtyFilter}
              touched={touchedRows.specialty}
              onChange={(k) => {
                markRowTouched('specialty');
                onSpecialtyFilterChange(getNextFilterValue(specialtyFilter, k));
              }}
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
