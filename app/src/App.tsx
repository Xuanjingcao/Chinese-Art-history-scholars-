import { lazy, Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import type { Professor, FilterRegion } from '@/types';
import type { CommunityDraft, CommunityPost } from '@/types/community';
import Header from '@/sections/Header';
import StatsBar from '@/sections/StatsBar';
import type { TitleFilter, SpecialtyFilter } from '@/sections/FilterBar';
import Footer from '@/sections/Footer';
import BackToTop from '@/components/BackToTop';
import MobileBottomNav, { type MobileNavKey } from '@/components/MobileBottomNav';
import HomeSupplementEntry from '@/sections/HomeSupplementEntry';
import { getCurrentUser, logoutUser, type AuthUser } from '@/lib/auth';
import { loadProfessorDataset, staticProfessorDataset } from '@/data/professors';
import { forceUnlockDocumentScroll } from '@/lib/documentScrollLock';
import { getSupplementEntryAction } from '@/lib/supplementAccess';
import CategoryDirectoryPage from '@/pages/CategoryDirectoryPage';
import AcademyDirectoryPage from '@/pages/AcademyDirectoryPage';
import HomeDiscoveryPage from '@/pages/HomeDiscoveryPage';

const ProfessorModal = lazy(() => import('@/components/ProfessorModal'));
const AuthModal = lazy(() => import('@/components/AuthModal'));
const MyAccountPage = lazy(() => import('@/pages/MyAccountPage'));
const SupplementPage = lazy(() => import('@/pages/SupplementPage'));
const CommunityFeedPage = lazy(() => import('@/pages/CommunityFeedPage'));
const CommunityEditorPage = lazy(() => import('@/pages/CommunityEditorPage'));
const CommunityPostPage = lazy(() => import('@/pages/CommunityPostPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));

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
  const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const [filter, setFilter] = useState<FilterRegion>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [showAccount, setShowAccount] = useState(false);
  const [publicView, setPublicView] = useState<'home' | 'category' | 'community' | 'academies' | 'supplement'>('home');
  const [selectedCommunityPost, setSelectedCommunityPost] = useState<CommunityPost | null>(null);
  const [showCommunityEditor, setShowCommunityEditor] = useState(false);
  const [openCommunityEditorAfterLogin, setOpenCommunityEditorAfterLogin] = useState(false);
  const [communityDraftToEdit, setCommunityDraftToEdit] = useState<CommunityDraft | undefined>();
  const [openSupplementAfterLogin, setOpenSupplementAfterLogin] = useState(false);
  const [professorDataset, setProfessorDataset] = useState(staticProfessorDataset);

  // ─── New multi-dimensional filters ──────────────────────────
  const [titleFilter, setTitleFilter] = useState<TitleFilter>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<SpecialtyFilter>('all');
  const [subRegion, setSubRegion] = useState<string>('all');

  // Count active non-default filters
  const activeFilterCount = [
    titleFilter !== 'all',
    specialtyFilter !== 'all',
    subRegion !== 'all',
  ].filter(Boolean).length;

  useEffect(() => {
    let cancelled = false;

    loadProfessorDataset().then((dataset) => {
      if (!cancelled) {
        setProfessorDataset(dataset);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || selectedProfessor) return;
    forceUnlockDocumentScroll(document);
  }, [selectedProfessor, publicView, showAccount, showAuth]);

  const professorLookup = useMemo(() => {
    const map = new Map<string, Professor>();
    professorDataset.regions.forEach(region => {
      region.universities.forEach(university => {
        university.professors.forEach(professor => {
          map.set(professor.id, professor);
        });
      });
    });
    return map;
  }, [professorDataset.regions]);

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
    if (openCommunityEditorAfterLogin) {
      setOpenCommunityEditorAfterLogin(false);
      setShowAccount(false);
      setPublicView('community');
      setShowCommunityEditor(true);
      return;
    }
    if (openSupplementAfterLogin) {
      setOpenSupplementAfterLogin(false);
      setShowAccount(false);
      setPublicView('supplement');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [openCommunityEditorAfterLogin, openSupplementAfterLogin]);

  const handleLogout = useCallback(() => {
    logoutUser();
    setCurrentUser(null);
    setShowAccount(false);
    setPublicView('home');
  }, []);

  const handleOpenHome = useCallback(() => {
    setShowAccount(false);
    setShowCommunityEditor(false);
    setPublicView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenAcademies = useCallback(() => {
    setShowAccount(false);
    setPublicView('academies');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenCategory = useCallback(() => {
    setShowAccount(false);
    setPublicView('category');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenCommunity = useCallback(() => {
    setShowAccount(false);
    setShowCommunityEditor(false);
    setSelectedCommunityPost(null);
    setPublicView('community');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenSupplement = useCallback(() => {
    const action = getSupplementEntryAction(Boolean(currentUser));
    if (action === 'request-login') {
      setOpenSupplementAfterLogin(true);
      setShowAuth(true);
      return;
    }

    setShowAccount(false);
    setPublicView('supplement');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentUser]);

  const handleOpenAccount = useCallback(() => {
    if (!currentUser) {
      setShowAuth(true);
      return;
    }
    setShowAccount(true);
  }, [currentUser]);

  const handleMobileNavigate = useCallback((key: MobileNavKey) => {
    if (key === 'home') {
      handleOpenHome();
      return;
    }
    if (key === 'category') {
      handleOpenCategory();
      return;
    }
    if (key === 'community') {
      handleOpenCommunity();
      return;
    }
    if (key === 'academies') {
      handleOpenAcademies();
      return;
    }
    handleOpenAccount();
  }, [handleOpenAcademies, handleOpenAccount, handleOpenCategory, handleOpenCommunity, handleOpenHome]);

  const activeMobileNav: MobileNavKey = showAccount
    ? 'account'
    : publicView === 'community'
      ? 'community'
      : publicView === 'academies'
      ? 'academies'
      : publicView === 'category'
        ? 'category'
        : 'home';

  if (isAdminPage) {
    return (
      <Suspense fallback={<InlineLoading label="正在打开数据后台..." />}>
        <AdminPage />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-[70px] md:pb-0">
      {/* Layer 1: Landscape painting */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: 'url(/landscape-bg-v2.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(6px) brightness(1.06) saturate(0.46) sepia(0.08)',
          transform: 'scale(1.06)',
        }}
      />

      {/* Layer 2: Light translucent overlay */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 1,
          backgroundColor: 'rgba(247, 242, 231, 0.68)',
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
        {publicView === 'home' && !showAccount && (
          <Header
            currentUser={currentUser}
            onLoginClick={() => setShowAuth(true)}
            onAccountClick={handleOpenAccount}
            onLogout={handleLogout}
            professorNames={professorNames}
            onNotificationProfessorClick={handleNotificationProfessorClick}
            compact
            subtitle="连接学者、院校与研究脉络"
          />
        )}
        {showAccount && currentUser ? (
          <Suspense fallback={<InlineLoading label="正在打开账户..." />}>
            <MyAccountPage
              userId={currentUser.userId}
              onBack={handleOpenHome}
              onLogout={handleLogout}
              onOpenCommunityPost={(post) => {
                setShowAccount(false);
                setPublicView('community');
                setSelectedCommunityPost(post);
              }}
              onEditCommunityDraft={(post) => {
                setShowAccount(false);
                setPublicView('community');
                setSelectedCommunityPost(null);
                setCommunityDraftToEdit(post);
                setShowCommunityEditor(true);
              }}
            />
          </Suspense>
        ) : publicView === 'supplement' && currentUser ? (
          <Suspense fallback={<InlineLoading label="正在打开资料补充..." />}>
            <SupplementPage
              userId={currentUser.userId}
              nickname={currentUser.nickname}
              onBack={handleOpenHome}
              onViewAccount={() => {
                setPublicView('home');
                setShowAccount(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </Suspense>
        ) : publicView === 'community' && selectedCommunityPost ? (
          <Suspense fallback={<InlineLoading label="正在打开帖子..." />}>
            <CommunityPostPage
              postId={selectedCommunityPost.id}
              currentUser={currentUser}
              onLoginClick={() => setShowAuth(true)}
              onBack={() => setSelectedCommunityPost(null)}
            />
          </Suspense>
        ) : publicView === 'community' && showCommunityEditor && currentUser ? (
          <Suspense fallback={<InlineLoading label="正在打开编辑器..." />}>
            <CommunityEditorPage
              key={communityDraftToEdit?.id || 'new-community-post'}
              userId={currentUser.userId}
              nickname={currentUser.nickname}
              initialDraft={communityDraftToEdit}
              onCancel={() => {
                setCommunityDraftToEdit(undefined);
                setShowCommunityEditor(false);
              }}
              onPublished={(post) => {
                setSelectedCommunityPost(post);
                setCommunityDraftToEdit(undefined);
                setShowCommunityEditor(false);
              }}
            />
          </Suspense>
        ) : publicView === 'community' ? (
          <Suspense fallback={<InlineLoading label="正在打开艺史广场..." />}>
            <CommunityFeedPage
              onBack={handleOpenHome}
              currentUser={currentUser}
              onLoginClick={() => setShowAuth(true)}
              onCreatePost={() => {
                if (!currentUser) {
                  setOpenCommunityEditorAfterLogin(true);
                  setShowAuth(true);
                  return;
                }
                setCommunityDraftToEdit(undefined);
                setShowCommunityEditor(true);
              }}
              onOpenPost={setSelectedCommunityPost}
            />
          </Suspense>
        ) : publicView === 'academies' ? (
          <Suspense fallback={<InlineLoading label="正在打开院校目录..." />}>
            <AcademyDirectoryPage
              regions={professorDataset.regions}
              schoolCoverageCount={professorDataset.schoolCoverageCount}
              countryCoverageCount={professorDataset.countryCoverageCount}
              onBack={handleOpenHome}
            />
          </Suspense>
        ) : publicView === 'category' ? (
          <Suspense fallback={<InlineLoading label="正在打开学者分类..." />}>
            <CategoryDirectoryPage
              regions={professorDataset.regions}
              filter={filter}
              searchQuery={searchQuery}
              titleFilter={titleFilter}
              specialtyFilter={specialtyFilter}
              subRegion={subRegion}
              activeFilterCount={activeFilterCount}
              currentUser={currentUser}
              onBack={handleOpenHome}
              onSearchChange={handleSearchChange}
              onFilterChange={handleFilterChange}
              onSubRegionChange={setSubRegion}
              onTitleFilterChange={setTitleFilter}
              onSpecialtyFilterChange={setSpecialtyFilter}
              onProfessorClick={handleProfessorClick}
              onLoginClick={() => setShowAuth(true)}
            />
          </Suspense>
        ) : (
          <>
            <StatsBar
              totalCount={professorDataset.totalCount}
              schoolCoverageCount={professorDataset.schoolCoverageCount}
              countryCoverageCount={professorDataset.countryCoverageCount}
              onSchoolCoverageClick={handleOpenAcademies}
            />
            <HomeDiscoveryPage
              professors={professorDataset.professorRecords}
              regions={professorDataset.regions}
              onOpenCategory={handleOpenCategory}
              onOpenAcademies={handleOpenAcademies}
              onProfessorClick={handleProfessorClick}
            />
            <HomeSupplementEntry onOpen={handleOpenSupplement} variant="mobile" />
            <HomeSupplementEntry onOpen={handleOpenSupplement} variant="desktop" />
          </>
        )}
        <Footer />
        <BackToTop />
        <MobileBottomNav active={activeMobileNav} onNavigate={handleMobileNavigate} />
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
          <AuthModal
            isOpen={showAuth}
            onClose={() => {
              setShowAuth(false);
              setOpenSupplementAfterLogin(false);
              setOpenCommunityEditorAfterLogin(false);
            }}
            onLogin={handleLogin}
          />
        </Suspense>
      )}
    </div>
  );
}
