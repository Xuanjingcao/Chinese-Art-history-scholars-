import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Bell, LogIn, LogOut, User, UserRoundPlus } from 'lucide-react';
import type { AuthUser } from '@/lib/auth';

const NotificationBell = lazy(() => import('@/components/NotificationBell'));

interface HeaderProps {
  currentUser?: AuthUser | null;
  onLoginClick?: () => void;
  onAccountClick?: () => void;
  onLogout?: () => void;
  professorNames?: Record<string, string>;
  onNotificationProfessorClick?: (profId: string) => void;
}

export default function Header({
  currentUser,
  onLoginClick,
  onAccountClick,
  onLogout,
  professorNames = {},
  onNotificationProfessorClick = () => {},
}: HeaderProps) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoginOption = () => {
    setShowAccountMenu(false);
    onLoginClick?.();
  };

  const handleAccountOption = () => {
    setShowAccountMenu(false);
    onAccountClick?.();
  };

  const handleLogoutOption = () => {
    setShowAccountMenu(false);
    onLogout?.();
  };

  return (
    <header className="relative z-10 flex flex-col items-center pt-16 pb-10 md:pt-20 md:pb-12 px-4">
      {/* ─── Top-right user area ─── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {currentUser ? (
          <Suspense fallback={<BellButton onClick={() => setShowAccountMenu(true)} />}>
            <NotificationBell
              userId={currentUser.userId}
              professorNames={professorNames}
              onProfessorClick={onNotificationProfessorClick}
            />
          </Suspense>
        ) : (
          <BellButton onClick={() => setShowAccountMenu(true)} />
        )}

        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setShowAccountMenu(prev => !prev)}
            className="flex items-center justify-center gap-1.5 transition-all hover:opacity-70"
            style={{
              fontFamily: 'var(--font-kai)',
              fontSize: '13px',
              color: '#5c4030',
              backgroundColor: 'rgba(92, 64, 48, 0.08)',
              border: '1px solid rgba(92, 64, 48, 0.15)',
              borderRadius: '8px',
              width: currentUser ? '34px' : '72px',
              height: '34px',
              cursor: 'pointer',
            }}
            title={currentUser ? currentUser.nickname : '账户'}
          >
            <User size={16} />
            {!currentUser && <span>账户</span>}
          </button>

          {showAccountMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-[168px] overflow-hidden"
              style={{
                backgroundColor: 'rgba(252, 248, 240, 0.98)',
                border: '1px solid rgba(30, 24, 16, 0.08)',
                borderRadius: '10px',
                boxShadow: '0 8px 28px rgba(30, 24, 16, 0.13)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {currentUser ? (
                <>
                  <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(30,24,16,0.06)' }}>
                    <div className="font-kai text-[11px]" style={{ color: '#8a7d6e' }}>当前账户</div>
                    <div className="font-kai text-sm truncate" style={{ color: '#3a2e22' }}>{currentUser.nickname}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAccountOption}
                    className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[rgba(92,64,48,0.06)]"
                    style={{ color: '#5c4030', fontFamily: 'var(--font-kai)', fontSize: '13px' }}
                  >
                    <User size={14} />
                    <span>我的账户</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoutOption}
                    className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[rgba(92,64,48,0.06)]"
                    style={{ color: '#8a4a3a', fontFamily: 'var(--font-kai)', fontSize: '13px' }}
                  >
                    <LogOut size={14} />
                    <span>退出登录</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleLoginOption}
                    className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[rgba(92,64,48,0.06)]"
                    style={{ color: '#5c4030', fontFamily: 'var(--font-kai)', fontSize: '13px' }}
                  >
                    <LogIn size={14} />
                    <span>登录</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoginOption}
                    className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[rgba(92,64,48,0.06)]"
                    style={{ color: '#5c4030', fontFamily: 'var(--font-kai)', fontSize: '13px' }}
                  >
                    <UserRoundPlus size={14} />
                    <span>注册</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Circular portrait */}
      <div
        className="relative mb-5 overflow-hidden rounded-full"
        style={{
          width: '96px',
          height: '96px',
          border: '2.5px solid rgba(92, 64, 48, 0.35)',
          boxShadow: '0 0 0 3px rgba(176, 130, 85, 0.18)',
        }}
      >
        <img
          src="/scholar-portrait-tall.jpg"
          alt="学者画像"
          width={360}
          height={480}
          className="h-full w-full object-cover object-top"
        />
      </div>

      {/* Title */}
      <h1
        className="font-serif text-center mb-1"
        style={{
          fontSize: 'clamp(30px, 5.5vw, 52px)',
          color: 'var(--ink)',
          letterSpacing: '0.2em',
          lineHeight: 1.2,
          fontWeight: 500,
        }}
      >
        中国艺术史在职学者名录
      </h1>

      {/* Subtitle */}
      <p
        className="font-kai text-center"
        style={{
          fontSize: 'clamp(14px, 2vw, 16px)',
          color: 'var(--ink-faint)',
          letterSpacing: '0.08em',
          lineHeight: 1.6,
        }}
      >
        海外中国艺术史在职学者全面数据库
        <span
          className="hidden md:inline font-serif italic ml-2"
          style={{ letterSpacing: '0.02em', opacity: 0.5 }}
        >
          Chinese Art History Scholars Database
        </span>
      </p>

      {/* Bottom rule */}
      <div
        className="w-16 mt-5"
        style={{ height: '2px', backgroundColor: 'rgba(30, 24, 16, 0.08)' }}
      />
    </header>
  );
}

function BellButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="relative flex items-center justify-center transition-opacity hover:opacity-70"
      aria-label="消息"
      title="消息"
      onClick={onClick}
      style={{
        width: '34px',
        height: '34px',
        color: '#8a7d6e',
        backgroundColor: 'rgba(92, 64, 48, 0.06)',
        border: '1px solid rgba(92, 64, 48, 0.12)',
        borderRadius: '8px',
        cursor: 'pointer',
      }}
    >
      <Bell size={16} />
    </button>
  );
}
