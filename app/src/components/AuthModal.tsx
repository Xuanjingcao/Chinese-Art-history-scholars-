import { useState, useEffect } from 'react';
import { loginUser, registerUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: AuthUser) => void;
}

type Step = 'connecting' | 'input' | 'error';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * AuthModal
 *
 * Flow:
 *   1. Open → try loginUser() to restore an existing profile
 *   2. loginUser success → auto login, close modal
 *   3. loginUser NEED_REGISTER → show nickname input
 */
export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [step, setStep] = useState<Step>('connecting');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const checkExistingUser = async () => {
      setNickname('');
      setError('');
      setShake(false);
      setLoading(false);
      setStep('connecting');

      try {
        const user = await loginUser();
        if (cancelled) return;
        onLogin(user);
        onClose();
      } catch (e) {
        if (cancelled) return;

        if (e instanceof Error && e.message === 'NEED_REGISTER') {
          setStep('input');
          return;
        }

        setError(getErrorMessage(e) || '登录失败');
        setStep('error');
      }
    };

    checkExistingUser();

    return () => {
      cancelled = true;
    };
  }, [isOpen, onClose, onLogin]);

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleSubmit = async () => {
    setError('');
    const trimmed = nickname.trim();
    if (!trimmed) { triggerError('请输入昵称'); return; }
    if (trimmed.length > 20) { triggerError('昵称不超过20个字'); return; }

    setLoading(true);
    try {
      const user = await registerUser(trimmed);
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
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] px-8 py-8 ${shake ? 'animate-shake' : ''}`}
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

        {step === 'connecting' && (
          <div className="text-center py-8">
            <div className="font-kai text-sm mb-4" style={{ color: '#6a5e50' }}>正在准备登录...</div>
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(92,64,48,0.2)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {step === 'input' && (
          <>
            <h2 className="font-title text-2xl font-bold text-center mb-1" style={{ color: '#1a1410', letterSpacing: '0.08em' }}>
              设置昵称
            </h2>
            <p className="font-kai text-xs text-center mb-6" style={{ color: '#a09682' }}>
              请先设置一个本地昵称
            </p>
            <div className="space-y-3">
              <div>
                <label className="font-kai text-xs block mb-1" style={{ color: '#6a5e50' }}>昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="font-kai text-sm w-full px-3 py-2.5 outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', border: '1px solid rgba(30,24,16,0.1)', color: '#1a1410' }}
                  placeholder="请输入昵称"
                  maxLength={20}
                  autoFocus
                />
              </div>
              {error && <p className="font-kai text-xs text-center py-1" style={{ color: '#b03530' }}>{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="font-kai text-sm w-full py-2.5 transition-all duration-200 hover:opacity-85 disabled:opacity-50"
                style={{ backgroundColor: '#5c4030', color: '#f5f0e8', borderRadius: '10px', letterSpacing: '0.08em', fontWeight: 500 }}
              >
                {loading ? '处理中...' : '确 认'}
              </button>
            </div>
          </>
        )}

        {step === 'error' && (
          <div className="text-center py-4">
            <h2 className="font-title text-xl font-bold text-center mb-4" style={{ color: '#1a1410' }}>登录失败</h2>
            <p className="font-kai text-sm text-center mb-3" style={{ color: '#b03530' }}>{error}</p>
            <p className="font-kai text-xs text-left mb-6 px-2" style={{ color: '#8a7d6e', lineHeight: 1.8 }}>
              可能原因：<br />
              1. 浏览器本地存储不可用<br />
              2. 当前页面处于隐私限制环境<br />
              3. 临时数据被浏览器清理
            </p>
            <button
              onClick={onClose}
              className="font-kai text-sm px-6 py-2.5 transition-all duration-200 hover:opacity-85"
              style={{ backgroundColor: '#5c4030', color: '#f5f0e8', borderRadius: '10px' }}
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
