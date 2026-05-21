import { useState, useEffect } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={handleClick}
      className="fixed z-50 flex items-center justify-center transition-all duration-300"
      style={{
        right: '24px',
        bottom: '32px',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: visible ? 'rgba(255,255,255,0.75)' : 'transparent',
        border: visible ? '1px solid rgba(30,24,16,0.15)' : '1px solid transparent',
        backdropFilter: visible ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(8px)' : 'none',
        boxShadow: visible ? '0 4px 16px rgba(30,24,16,0.10)' : 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        pointerEvents: visible ? 'auto' : 'none',
        cursor: 'pointer',
      }}
      aria-label="回到顶部"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
