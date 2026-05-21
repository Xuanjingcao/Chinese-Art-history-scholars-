import { useState, useCallback, useEffect } from 'react';
import type { Professor, FilterRegion } from '@/types';
import Header from '@/sections/Header';
import StatsBar from '@/sections/StatsBar';
import FilterBar from '@/sections/FilterBar';
import type { TitleFilter, InstitutionFilter, SpecialtyFilter } from '@/sections/FilterBar';
import ProfessorList from '@/sections/ProfessorList';
import ProfessorModal from '@/components/ProfessorModal';
import AuthModal from '@/components/AuthModal';
import Footer from '@/sections/Footer';
import BackToTop from '@/components/BackToTop';
import { getCurrentUser, logoutUser, type AuthUser } from '@/lib/auth';

export default function App() {
  const [filter, setFilter] = useState<FilterRegion>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // ─── New multi-dimensional filters ──────────────────────────
  const [titleFilter, setTitleFilter] = useState<TitleFilter>('all');
  const [institutionFilter, setInstitutionFilter] = useState<InstitutionFilter>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<SpecialtyFilter>('all');
  const [subRegion, setSubRegion] = useState<string>('all');

  // Load current user on mount
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Count active non-default filters
  const activeFilterCount = [
    titleFilter !== 'all',
    institutionFilter !== 'all',
    specialtyFilter !== 'all',
    subRegion !== 'all',
  ].filter(Boolean).length;

  const handleFilterChange = useCallback((f: FilterRegion) => {
    setFilter(f);
  }, []);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleProfessorClick = useCallback((professor: Professor) => {
    setSelectedProfessor(professor);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedProfessor(null);
  }, []);

  const handleLogin = useCallback((user: AuthUser) => {
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser();
    setCurrentUser(null);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Layer 1: Landscape painting */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: 'url(/landscape-bg-v2.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(4px) brightness(0.88)',
          transform: 'scale(1.06)',
        }}
      />

      {/* Layer 2: Light translucent overlay */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 1,
          backgroundColor: 'rgba(232, 226, 214, 0.40)',
        }}
      />

      {/* Layer 3: Bottom mist */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: `
            radial-gradient(ellipse 120% 50% at 50% 100%, rgba(180, 195, 180, 0.15) 0%, transparent 55%),
            radial-gradient(ellipse 80% 40% at 20% 85%, rgba(160, 185, 195, 0.10) 0%, transparent 50%)
          `,
        }}
      />

      {/* Layer 4: Content */}
      <div className="relative" style={{ zIndex: 10 }}>
        <Header
          currentUser={currentUser}
          onLoginClick={() => setShowAuth(true)}
          onLogout={handleLogout}
        />
        <StatsBar />

        {/* Subtitle note */}
        <p
          className="font-serif text-center mx-auto px-6 mt-2 mb-2"
          style={{
            color: '#8a7d6e',
            fontSize: '13px',
            letterSpacing: '0.1em',
            lineHeight: 1.6,
            maxWidth: '480px',
          }}
        >
          收录国内外高校中国艺术史相关学者，持续更新中
        </p>

        {/* Sticky Filter Bar */}
        <div className="sticky top-0 z-30">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            regionFilter={filter}
            onRegionFilterChange={handleFilterChange}
            subRegionFilter={subRegion}
            onSubRegionFilterChange={setSubRegion}
            titleFilter={titleFilter}
            onTitleFilterChange={setTitleFilter}
            institutionFilter={institutionFilter}
            onInstitutionFilterChange={setInstitutionFilter}
            specialtyFilter={specialtyFilter}
            onSpecialtyFilterChange={setSpecialtyFilter}
            activeFilterCount={activeFilterCount}
          />
        </div>

        <ProfessorList
          filter={filter}
          searchQuery={searchQuery}
          titleFilter={titleFilter}
          institutionFilter={institutionFilter}
          specialtyFilter={specialtyFilter}
          subRegion={subRegion}
          onProfessorClick={handleProfessorClick}
        />
        <Footer />
        <BackToTop />
      </div>

      <ProfessorModal
        professor={selectedProfessor}
        onClose={handleCloseModal}
        currentUser={currentUser}
        onLoginClick={() => setShowAuth(true)}
      />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLogin} />
    </div>
  );
}
