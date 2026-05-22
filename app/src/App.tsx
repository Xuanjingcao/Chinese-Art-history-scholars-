import { lazy, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import type { Professor, FilterRegion } from '@/types';
import Header from '@/sections/Header';
import StatsBar from '@/sections/StatsBar';
import FilterBar from '@/sections/FilterBar';
import type { TitleFilter, SpecialtyFilter } from '@/sections/FilterBar';
import ProfessorList from '@/sections/ProfessorList';
import Footer from '@/sections/Footer';
import BackToTop from '@/components/BackToTop';
import { getCurrentUser, logoutUser, type AuthUser } from '@/lib/auth';
import { regions } from '@/data/professors';

const ProfessorModal = lazy(() => import('@/components/ProfessorModal'));
const AuthModal = lazy(() => import('@/components/AuthModal'));
const MyAccountPage = lazy(() => import('@/pages/MyAccountPage'));

function InlineLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="font-kai text-sm" style={{ color: '#8a7d6e' }}>
        {label}
      </p>
    </div>
  );
}

export default function App() {
  const [filter, setFilter] = useState<FilterRegion>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  // ─── New multi-dimensional filters ──────────────────────────
  const [titleFilter, setTitleFilter] = useState<TitleFilter>('all');
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
    specialtyFilter !== 'all',
    subRegion !== 'all',
  ].filter(Boolean).length;

  const professorLookup = useMemo(() => {
    const map = new Map<string, Professor>();
    regions.forEach(region => {
      region.universities.forEach(university => {
        university.professors.forEach(professor => {
          map.set(professor.id, professor);
        });
      });
    });
    return map;
  }, []);

  const professorNames = useMemo(() => {
    return Object.fromEntries(
      Array.from(professorLookup.values()).map(professor => [professor.id, professor.name]),
    );
  }, [professorLookup]);

  const handleFilterChange = useCallback((f: FilterRegion) => {
    setFilter(f);
  }, []);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleProfessorClick = useCallback((professor: Professor) => {
    setSelectedProfessor(professor);
  }, []);

  const handleNotificationProfessorClick = useCallback((profId: string) => {
    const professor = professorLookup.get(profId);
    if (professor) {
      setShowAccount(false);
      setSelectedProfessor(professor);
    }
  }, [professorLookup]);

  const handleCloseModal = useCallback(() => {
    setSelectedProfessor(null);
  }, []);

  const handleLogin = useCallback((user: AuthUser) => {
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser();
    setCurrentUser(null);
    setShowAccount(false);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Layer 1: Landscape painting */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: 'url(/landscape-bg-v2.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(6px) brightness(0.90) saturate(0.58) sepia(0.10)',
          transform: 'scale(1.06)',
        }}
      />

      {/* Layer 2: Light translucent overlay */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 1,
          backgroundColor: 'rgba(222, 211, 188, 0.52)',
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
          onAccountClick={() => setShowAccount(true)}
          onLogout={handleLogout}
          professorNames={professorNames}
          onNotificationProfessorClick={handleNotificationProfessorClick}
        />
        {showAccount && currentUser ? (
          <Suspense fallback={<InlineLoading label="正在打开账户..." />}>
            <MyAccountPage
              userId={currentUser.userId}
              onBack={() => setShowAccount(false)}
              onLogout={handleLogout}
            />
          </Suspense>
        ) : (
          <>
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

            {/* Filter Bar */}
            <div className="relative z-30">
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                regionFilter={filter}
                onRegionFilterChange={handleFilterChange}
                subRegionFilter={subRegion}
                onSubRegionFilterChange={setSubRegion}
                titleFilter={titleFilter}
                onTitleFilterChange={setTitleFilter}
                specialtyFilter={specialtyFilter}
                onSpecialtyFilterChange={setSpecialtyFilter}
                activeFilterCount={activeFilterCount}
              />
            </div>

            <ProfessorList
              filter={filter}
              searchQuery={searchQuery}
              titleFilter={titleFilter}
              specialtyFilter={specialtyFilter}
              subRegion={subRegion}
              onProfessorClick={handleProfessorClick}
            />
          </>
        )}
        <Footer />
        <BackToTop />
      </div>

      {selectedProfessor && (
        <Suspense fallback={<InlineLoading label="正在加载学者详情..." />}>
          <ProfessorModal
            professor={selectedProfessor}
            onClose={handleCloseModal}
            currentUser={currentUser}
            onLoginClick={() => setShowAuth(true)}
          />
        </Suspense>
      )}
      {showAuth && (
        <Suspense fallback={<InlineLoading label="正在准备登录..." />}>
          <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLogin} />
        </Suspense>
      )}
    </div>
  );
}
