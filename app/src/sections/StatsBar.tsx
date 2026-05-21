import { totalCount, professorCount, associateCount, assistantCount, lecturerCount, regionCount } from '@/data/professors';

const stats = [
  { num: totalCount, label: '学者总计' },
  { num: professorCount, label: '教　授' },
  { num: associateCount, label: '副教授' },
  { num: assistantCount, label: '助理教授' },
  { num: lecturerCount, label: '讲　师' },
  { num: regionCount.length, label: '地区覆盖' },
];

export default function StatsBar() {
  return (
    <div
      className="relative z-10 flex flex-wrap justify-center gap-x-2.5 gap-y-1.5 md:gap-x-4 py-2 px-3 md:px-4 mx-3 md:mx-4 mb-3 md:mb-4"
      style={{
        backgroundColor: 'rgba(250, 247, 240, 0.5)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(30, 24, 16, 0.07)',
        backdropFilter: 'blur(6px) saturate(1.05)',
        WebkitBackdropFilter: 'blur(6px) saturate(1.05)',
        boxShadow: '0 1px 6px rgba(30, 24, 16, 0.03)',
      }}
    >
      {stats.map((stat, i) => (
        <div className="flex items-center" key={i}>
          {i > 0 && (
            <div
              className="hidden md:block self-stretch mr-3 md:mr-5"
              style={{ width: '1px', backgroundColor: 'rgba(30, 24, 16, 0.06)' }}
            />
          )}
          <div className="text-center px-1">
            <span
              className="font-title block text-lg md:text-xl"
              style={{ color: 'var(--ink)', letterSpacing: '0.02em', fontWeight: 500 }}
            >
              {stat.num}
            </span>
            <span
              className="font-serif text-[9px] md:text-[10px] block mt-0.5"
              style={{ color: 'var(--ink-faint)', letterSpacing: '0.06em' }}
            >
              {stat.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
