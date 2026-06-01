import { ArrowLeft, LibraryBig } from 'lucide-react';
import type { AuthUser } from '@/lib/auth';
import type { FilterRegion, Professor, Region } from '@/types';
import FilterBar, { type SpecialtyFilter, type TitleFilter } from '@/sections/FilterBar';
import ProfessorList from '@/sections/ProfessorList';

export default function CategoryDirectoryPage({
  regions,
  filter,
  searchQuery,
  titleFilter,
  specialtyFilter,
  subRegion,
  activeFilterCount,
  currentUser,
  onBack,
  onSearchChange,
  onFilterChange,
  onSubRegionChange,
  onTitleFilterChange,
  onSpecialtyFilterChange,
  onProfessorClick,
  onLoginClick,
}: {
  regions: Region[];
  filter: FilterRegion;
  searchQuery: string;
  titleFilter: TitleFilter;
  specialtyFilter: SpecialtyFilter;
  subRegion: string;
  activeFilterCount: number;
  currentUser?: AuthUser | null;
  onBack: () => void;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: FilterRegion) => void;
  onSubRegionChange: (region: string) => void;
  onTitleFilterChange: (filter: TitleFilter) => void;
  onSpecialtyFilterChange: (filter: SpecialtyFilter) => void;
  onProfessorClick: (professor: Professor) => void;
  onLoginClick: () => void;
}) {
  return (
    <main className="mx-auto min-h-[calc(100vh-72px)] max-w-[1320px] pb-5 pt-4 md:pb-10 md:pt-8">
      <div className="mb-4 flex items-center gap-3 px-3 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ color: '#5c4030', backgroundColor: 'rgba(252,248,240,0.76)', border: '1px solid rgba(92,64,48,0.14)' }}
          aria-label="返回首页"
        >
          <ArrowLeft size={18} strokeWidth={1.7} />
        </button>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={{ color: '#687756', backgroundColor: 'rgba(102,118,83,0.1)' }}>
          <LibraryBig size={19} strokeWidth={1.7} />
        </span>
        <span>
          <h1 className="font-kai text-[22px] md:text-[28px]" style={{ color: '#34271c', letterSpacing: '0.08em' }}>学者分类</h1>
          <p className="mt-0.5 font-kai text-[12px] md:text-[13px]" style={{ color: '#8a7d6e' }}>按地区、院校与研究方向浏览完整名录</p>
        </span>
      </div>

      <div className="relative z-30">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          regionFilter={filter}
          onRegionFilterChange={onFilterChange}
          subRegionFilter={subRegion}
          onSubRegionFilterChange={onSubRegionChange}
          titleFilter={titleFilter}
          onTitleFilterChange={onTitleFilterChange}
          specialtyFilter={specialtyFilter}
          onSpecialtyFilterChange={onSpecialtyFilterChange}
          activeFilterCount={activeFilterCount}
        />
      </div>

      <ProfessorList
        regions={regions}
        filter={filter}
        searchQuery={searchQuery}
        titleFilter={titleFilter}
        specialtyFilter={specialtyFilter}
        subRegion={subRegion}
        onProfessorClick={onProfessorClick}
        currentUser={currentUser}
        onLoginClick={onLoginClick}
      />
    </main>
  );
}
