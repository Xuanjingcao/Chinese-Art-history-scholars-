import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Bell, Cloud, CloudOff, LogIn, LogOut, User, UserRoundPlus } from 'lucide-react';
import type { AuthUser } from '@/lib/auth';
import { getBrowserCloudBaseConfig } from '@/lib/cloudbaseConfig';

const NotificationBell = lazy(() => import('@/components/NotificationBell'));

interface HeaderProps {
  currentUser?: AuthUser | null;
  onLoginClick?: () => void;
  onAccountClick?: () => void;
  onLogout?: () => void;
  professorNames?: Record<string, string>;
  onNotificationProfessorClick?: (profId: string) => void;
  compact?: boolean;
  subtitle?: string;
}

export default function Header({
  currentUser,
  onLoginClick,
  onAccountClick,
  onLogout,
  professorNames = {},
  onNotificationProfessorClick = () => {},
  compact = false,
  subtitle = '收录国内外高校中国艺术史相关在职学者，持续更新中',
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
    <header className={`relative z-10 flex flex-col items-center overflow-hidden px-4 ${compact ? 'pb-6 pt-14 md:pb-8 md:pt-16' : 'pb-8 pt-16 md:pb-10 md:pt-20'}`}>
      <MountainWash className="pointer-events-none absolute right-0 top-10 hidden h-64 w-[360px] opacity-45 md:block" />
      <BackendStatus />

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
              width: currentUser ? '64px' : '72px',
              height: '34px',
              cursor: 'pointer',
            }}
            title={currentUser ? `${currentUser.nickname} · 我的` : '账户'}
          >
            <User size={16} />
            <span>{currentUser ? '我的' : '账户'}</span>
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
        className={`relative overflow-visible rounded-full ${compact ? 'mb-4 h-[82px] w-[82px] md:h-[96px] md:w-[96px]' : 'mb-5 h-[96px] w-[96px]'}`}
        style={{
          border: '2.5px solid rgba(92, 64, 48, 0.35)',
          boxShadow: '0 0 0 3px rgba(176, 130, 85, 0.18), 0 10px 24px rgba(56, 44, 30, 0.10)',
        }}
      >
        <div className="h-full w-full overflow-hidden rounded-full">
          <img
            src="/scholar-portrait-tall.jpg"
            alt="学者画像"
            width={360}
            height={480}
            className="h-full w-full object-cover object-top"
          />
        </div>
      </div>

      {/* Title */}
      <h1
        className="font-serif mb-1 max-w-full text-center text-[clamp(20px,6.6vw,28px)] font-normal md:text-[clamp(30px,5.5vw,52px)] md:font-medium"
        style={{
          color: 'var(--ink)',
          letterSpacing: '0.035em',
          lineHeight: 1.18,
        }}
      >
        中国艺术史在职学者名录
      </h1>

      <div className={`${compact ? 'mt-3 md:mt-5' : 'mt-5 md:mt-6'} flex w-full max-w-[700px] items-center justify-center gap-4`}>
        <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(139, 120, 87, 0.35))' }} />
        <p
          className="font-serif text-center text-[12px] md:text-[18px]"
          style={{
            color: '#827260',
            letterSpacing: '0.08em',
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
        <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(139, 120, 87, 0.35), transparent)' }} />
      </div>
    </header>
  );
}

function BackendStatus() {
  const cloudEnabled = getBrowserCloudBaseConfig().enabled;
  const copy = cloudEnabled
    ? {
        label: '云端后台',
        title: 'CloudBase 已启用；云端功能会在实际使用时连接。',
        color: '#3f6b4a',
        bg: 'rgba(240,248,239,0.78)',
        Icon: Cloud,
      }
    : {
        label: '本地模式',
        title: '当前使用浏览器本地缓存。若要连接 CloudBase，请在 .env.local 设置 VITE_ENABLE_CLOUDBASE=true 后重启 npm run dev。',
        color: '#7c6d5a',
        bg: 'rgba(255,255,255,0.58)',
        Icon: CloudOff,
      };
  const Icon = copy.Icon;

  return (
    <div
      className="absolute left-4 top-4 z-20 inline-flex h-[34px] items-center gap-1.5 rounded-lg px-2.5 font-kai text-xs"
      style={{
        color: copy.color,
        backgroundColor: copy.bg,
        border: '1px solid rgba(92,64,48,0.12)',
        backdropFilter: 'blur(10px)',
      }}
      title={copy.title}
    >
      <Icon size={14} />
      <span>{copy.label}</span>
    </div>
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

function MountainWash({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 260" fill="none" aria-hidden="true">
      <path
        d="M19 217c38-44 60-66 90-66 25 0 39 24 60 20 22-4 30-48 65-74 33-25 63-11 85-36 14-16 27-34 45-40 18 43 32 91 41 146"
        stroke="#7c8273"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.15"
      />
      <path
        d="M3 235c52-30 111-39 172-28 46 8 83 25 138 15 35-6 68-20 101-20"
        stroke="#8c907e"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.13"
      />
      <path
        d="M210 155c19-25 33-41 48-50 19-12 37-13 55-26"
        stroke="#7c8273"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.12"
      />
    </svg>
  );
}
