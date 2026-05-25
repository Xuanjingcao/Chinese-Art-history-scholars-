import { useState } from 'react';
import { loginUser, registerUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: AuthUser) => void;
}

type Mode = 'login' | 'register';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) { triggerError('请输入昵称'); return; }
    if (trimmedNickname.length > 20) { triggerError('昵称不超过20个字'); return; }
    if (password.length < 6) { triggerError('密码至少6位'); return; }

    setLoading(true);
    try {
      const user = mode === 'login'
        ? await loginUser(trimmedNickname, password)
        : await registerUser(trimmedNickname, password);
      onLogin(user);
      onClose();
    } catch (e) {
      triggerError(getErrorMessage(e) || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0" style={{ zIndex: 1100 }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(44, 36, 22, 0.55)' }} onClick={onClose} />
      <div
        className={`absolute left-1/2 top-1/2 w-[360px] -translate-x-1/2 -translate-y-1/2 px-8 py-8 ${shake ? 'animate-shake' : ''}`}
        style={{
          backgroundColor: 'rgba(252, 248, 240, 0.98)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 16px 48px rgba(30, 24, 16, 0.15)',
          border: '1px solid rgba(30, 24, 16, 0.08)',
        }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 transition-opacity hover:opacity-60" style={{ color: '#a09682' }}>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="mb-6 flex rounded-full p-1" style={{ backgroundColor: 'rgba(92,64,48,0.08)' }}>
          {(['login', 'register'] as const).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className="font-kai flex-1 rounded-full py-2 text-sm transition-all"
              style={{
                backgroundColor: mode === item ? '#5c4030' : 'transparent',
                color: mode === item ? '#f5f0e8' : '#6a5e50',
              }}
            >
              {item === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        <h2 className="font-title mb-1 text-center text-2xl font-bold" style={{ color: '#1a1410', letterSpacing: '0.08em' }}>
          {mode === 'login' ? '账户登录' : '创建账户'}
        </h2>
        <p className="font-kai mb-6 text-center text-xs" style={{ color: '#a09682' }}>
          {mode === 'login' ? '使用昵称和密码进入账户' : '注册后可评论、收藏与评分'}
        </p>

        <div className="space-y-3">
          <div>
            <label className="font-kai mb-1 block text-xs" style={{ color: '#6a5e50' }}>昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="font-kai w-full px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', border: '1px solid rgba(30,24,16,0.1)', color: '#1a1410' }}
              placeholder="请输入昵称"
              maxLength={20}
              autoFocus
            />
          </div>

          <div>
            <label className="font-kai mb-1 block text-xs" style={{ color: '#6a5e50' }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="font-kai w-full px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', border: '1px solid rgba(30,24,16,0.1)', color: '#1a1410' }}
              placeholder="至少6位"
            />
          </div>

          {error && <p className="font-kai py-1 text-center text-xs" style={{ color: '#b03530' }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="font-kai w-full py-2.5 text-sm transition-all duration-200 hover:opacity-85 disabled:opacity-50"
            style={{ backgroundColor: '#5c4030', color: '#f5f0e8', borderRadius: '10px', letterSpacing: '0.08em', fontWeight: 500 }}
          >
            {loading ? '处理中...' : mode === 'login' ? '登 录' : '注 册'}
          </button>
        </div>
      </div>
    </div>
  );
}
