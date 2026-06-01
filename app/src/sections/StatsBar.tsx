import { Building2, Globe2, UserRound } from 'lucide-react';

type StatsBarProps = {
  totalCount: number;
  schoolCoverageCount: number;
  countryCoverageCount: number;
  onSchoolCoverageClick?: () => void;
};

export default function StatsBar({
  totalCount,
  schoolCoverageCount,
  countryCoverageCount,
  onSchoolCoverageClick,
}: StatsBarProps) {
  const stats = [
    { num: totalCount, label: '学者总计', icon: UserRound },
    { num: schoolCoverageCount, label: '学校覆盖', icon: Building2, onClick: onSchoolCoverageClick },
    { num: countryCoverageCount, label: '国家覆盖', icon: Globe2 },
  ];

  return (
    <div
      className="relative z-10 mx-auto mb-4 grid w-[calc(100%-1.5rem)] max-w-[960px] grid-cols-3 gap-y-3 px-2 py-3 md:mb-8 md:w-[calc(100%-3rem)] md:px-5 md:py-4"
      style={{
        backgroundColor: 'rgba(252, 248, 240, 0.76)',
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.62), rgba(232,219,194,0.12))',
        borderRadius: '16px',
        border: '1px solid rgba(139, 120, 87, 0.18)',
        outline: '1px solid rgba(255, 252, 245, 0.76)',
        outlineOffset: '-7px',
        backdropFilter: 'blur(10px) saturate(1.08)',
        WebkitBackdropFilter: 'blur(10px) saturate(1.08)',
        boxShadow: '0 12px 30px rgba(56, 44, 30, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.56)',
      }}
    >
      {stats.map((stat, i) => (
        <div className="relative flex min-w-0 items-center justify-center" key={i}>
          {i > 0 && (
            <div
              className="absolute left-0 top-1/2 h-9 -translate-y-1/2 md:h-12"
              style={{ width: '1px', backgroundColor: 'rgba(139, 120, 87, 0.22)' }}
            />
          )}
          <button
            type="button"
            onClick={stat.onClick}
            disabled={!stat.onClick}
            className="flex min-w-0 items-center justify-center gap-2 px-1 text-center transition-opacity enabled:cursor-pointer enabled:hover:opacity-70 md:gap-5"
            aria-label={stat.onClick ? `打开${stat.label}` : undefined}
          >
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-11 md:w-11"
              style={{
                color: '#78835f',
                background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.72), rgba(232,226,209,0.72))',
                border: '1px solid rgba(139, 120, 87, 0.15)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 4px 12px rgba(58,46,34,0.06)',
              }}
              aria-hidden="true"
            >
              <stat.icon className="h-[18px] w-[18px] md:h-7 md:w-7" strokeWidth={1.7} />
            </span>
            <div className="min-w-0 text-center md:text-left">
            <span
              className="font-title block text-[1.55rem] leading-none md:text-[2.55rem]"
              style={{ color: 'var(--ink)', letterSpacing: '0.02em', fontWeight: 600 }}
            >
              {stat.num}
            </span>
            <span
              className="mt-1 block whitespace-nowrap font-serif text-[0.68rem] leading-none md:text-base"
              style={{ color: 'rgba(58, 46, 34, 0.72)', letterSpacing: '0.04em', fontWeight: 500 }}
            >
              {stat.label}
            </span>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
