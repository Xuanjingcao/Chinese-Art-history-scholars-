import { Building2, Home, LayoutGrid, UserRound } from 'lucide-react';

export type MobileNavKey = 'home' | 'category' | 'academies' | 'account';

export default function MobileBottomNav({
  active,
  onNavigate,
}: {
  active: MobileNavKey;
  onNavigate: (key: MobileNavKey) => void;
}) {
  const items = [
    { key: 'home', label: '首页', icon: Home },
    { key: 'category', label: '分类', icon: LayoutGrid },
    { key: 'academies', label: '院校', icon: Building2 },
    { key: 'account', label: '我的', icon: UserRound },
  ] satisfies { key: MobileNavKey; label: string; icon: typeof Home }[];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      aria-label="移动端主导航"
      style={{
        background: 'rgba(250, 246, 237, 0.94)',
        borderTop: '1px solid rgba(92, 64, 48, 0.14)',
        boxShadow: '0 -8px 22px rgba(56, 44, 30, 0.08)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="grid h-[62px] grid-cols-4">
        {items.map(({ key, label, icon: Icon }) => {
          const selected = active === key;

          return (
            <button
              key={key}
              type="button"
              data-testid={`mobile-nav-${key}`}
              onClick={() => onNavigate(key)}
              className="flex min-w-0 flex-col items-center justify-center gap-1 font-kai text-[11px] transition-colors"
              style={{ color: selected ? '#61704f' : '#8b7c6b' }}
              aria-current={selected ? 'page' : undefined}
            >
              <span
                className="inline-flex h-7 w-10 items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: selected ? 'rgba(102, 118, 83, 0.13)' : 'transparent' }}
              >
                <Icon size={17} strokeWidth={selected ? 2 : 1.65} />
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
