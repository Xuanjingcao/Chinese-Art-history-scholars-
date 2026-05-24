import { totalCount, professorCount, associateCount, assistantCount, lecturerCount, countryCoverageCount } from '@/data/professors';

const stats = [
  { num: totalCount, label: '学者总计' },
  { num: professorCount, label: '教　授' },
  { num: associateCount, label: '副教授' },
  { num: assistantCount, label: '助理教授' },
  { num: lecturerCount, label: '讲　师' },
  { num: countryCoverageCount, label: '国家覆盖' },
];

export default function StatsBar() {
  return (
    <div
      className="relative z-10 mx-auto mb-4 grid w-[calc(100%-1.5rem)] max-w-[1280px] grid-cols-3 gap-y-3 px-2 py-3 sm:grid-cols-6 md:mb-5 md:w-[calc(100%-3rem)] md:px-5 md:py-4"
      style={{
        backgroundColor: 'rgba(242, 235, 219, 0.82)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(30, 24, 16, 0.11)',
        backdropFilter: 'blur(8px) saturate(1.08)',
        WebkitBackdropFilter: 'blur(8px) saturate(1.08)',
        boxShadow: '0 8px 22px rgba(30, 24, 16, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.34)',
      }}
    >
      {stats.map((stat, i) => (
        <div className="relative flex min-w-0 items-center justify-center" key={i}>
          {i > 0 && (
            <div
              className="absolute left-0 top-1/2 hidden h-8 -translate-y-1/2 sm:block"
              style={{ width: '1px', backgroundColor: 'rgba(30, 24, 16, 0.09)' }}
            />
          )}
          <div className="min-w-0 px-1 text-center">
            <span
              className="font-title block text-[1.55rem] leading-none md:text-[2rem]"
              style={{ color: 'var(--ink)', letterSpacing: '0.02em', fontWeight: 600 }}
            >
              {stat.num}
            </span>
            <span
              className="mt-1 block whitespace-nowrap font-serif text-[0.68rem] leading-none md:text-sm"
              style={{ color: 'rgba(58, 46, 34, 0.72)', letterSpacing: '0.04em', fontWeight: 500 }}
            >
              {stat.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
