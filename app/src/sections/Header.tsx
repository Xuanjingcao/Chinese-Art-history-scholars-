import { LogIn, LogOut, User } from 'lucide-react';
import type { AuthUser } from '@/lib/auth';

interface HeaderProps {
  currentUser?: AuthUser | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
}

export default function Header({ currentUser, onLoginClick, onLogout }: HeaderProps) {
  return (
    <header className="relative z-10 flex flex-col items-center pt-16 pb-10 md:pt-20 md:pb-12 px-4">
      {/* ─── Top-right user area ─── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {currentUser ? (
          <div className="flex items-center gap-2">
            {/* User avatar circle */}
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'rgba(92, 64, 48, 0.12)',
                border: '1px solid rgba(92, 64, 48, 0.2)',
              }}
              title={currentUser.nickname}
            >
              <User size={16} style={{ color: '#5c4030' }} />
            </div>
            {/* Nickname */}
            <span
              className="hidden sm:inline"
              style={{
                fontFamily: 'var(--font-kai)',
                fontSize: '13px',
                color: '#5c4030',
              }}
            >
              {currentUser.nickname}
            </span>
            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 transition-opacity hover:opacity-60 ml-1"
              style={{
                fontFamily: 'var(--font-kai)',
                fontSize: '12px',
                color: '#8a7d6e',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
              title="退出登录"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 transition-all hover:opacity-70"
            style={{
              fontFamily: 'var(--font-kai)',
              fontSize: '13px',
              color: '#5c4030',
              backgroundColor: 'rgba(92, 64, 48, 0.08)',
              border: '1px solid rgba(92, 64, 48, 0.15)',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            <LogIn size={14} />
            <span>登录</span>
          </button>
        )}
      </div>

      {/* Circular portrait */}
      <div
        className="relative rounded-full overflow-hidden mb-5"
        style={{
          width: '96px',
          height: '96px',
          border: '2.5px solid rgba(92, 64, 48, 0.35)',
          boxShadow: '0 0 0 3px rgba(176, 130, 85, 0.18)',
        }}
      >
        <img
          src="/scholar-portrait.png"
          alt="学者画像"
          className="w-full h-full object-cover"
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
        中国艺术史学者名录
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
        海外中国艺术史学者全面数据库
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
