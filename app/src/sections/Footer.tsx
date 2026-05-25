export default function Footer() {
  return (
    <footer
      className="relative z-10 px-6 py-8 text-center"
      style={{ borderTop: '1px solid rgba(92,74,50,0.12)', color: '#5f5144' }}
    >
      <p className="font-serif text-[11px]" style={{ letterSpacing: '0.16em' }}>
        中国艺术史在职学者名录 · 资料仅供学术参考 · 如有更新请联系维护者
      </p>
      <a
        href="mailto:cao.991@outlook.com"
        className="font-serif mt-3 inline-block text-[12px] transition-opacity hover:opacity-70"
        style={{ color: '#4a3d2a', letterSpacing: '0.08em' }}
      >
        cao.991@outlook.com
      </a>
    </footer>
  );
}
