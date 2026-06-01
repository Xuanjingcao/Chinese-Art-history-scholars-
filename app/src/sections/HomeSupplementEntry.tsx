import { ArrowRight, Building2, FilePlus2, GraduationCap, Link2 } from 'lucide-react';

export default function HomeSupplementEntry({
  onOpen,
  variant = 'desktop',
}: {
  onOpen: () => void;
  variant?: 'desktop' | 'mobile';
}) {
  if (variant === 'mobile') {
    return (
      <section className="px-3 pb-4 pt-2 md:hidden">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center gap-3 rounded-[15px] px-4 py-3.5 text-left transition-opacity active:opacity-75"
          style={{
            background: 'linear-gradient(135deg, rgba(252,248,240,0.88), rgba(239,230,213,0.68))',
            border: '1px solid rgba(139, 120, 87, 0.16)',
            boxShadow: '0 7px 18px rgba(56, 44, 30, 0.05)',
          }}
        >
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              color: '#6d7958',
              backgroundColor: 'rgba(255,253,248,0.76)',
              border: '1px solid rgba(139, 120, 87, 0.15)',
            }}
          >
            <FilePlus2 size={17} strokeWidth={1.7} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block font-kai text-[17px] font-normal" style={{ color: '#34271c', letterSpacing: '0.05em' }}>
              补充资料
            </strong>
            <span className="mt-1 block font-kai text-[12px] leading-5" style={{ color: '#897763' }}>
              提交遗漏老师、院校或官网线索
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-kai text-[13px]" style={{ color: '#667653' }}>
            去补充
            <ArrowRight size={14} strokeWidth={1.8} />
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="hidden pt-4 md:block md:pt-6">
      <div className="mx-auto max-w-[1180px] px-3 md:px-6">
        <div
          className="relative w-full overflow-hidden rounded-[18px] px-5 py-5 md:flex md:items-center md:justify-between md:gap-8 md:px-7 md:py-6 lg:px-8"
          style={{
            background: 'linear-gradient(135deg, rgba(252,248,240,0.9), rgba(239,230,213,0.8))',
            border: '1px solid rgba(139, 120, 87, 0.17)',
            boxShadow: '0 10px 26px rgba(56, 44, 30, 0.07)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(112,132,91,0.16), transparent 68%)' }}
          />

          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  color: '#6d7958',
                  backgroundColor: 'rgba(255,253,248,0.74)',
                  border: '1px solid rgba(139, 120, 87, 0.16)',
                }}
              >
                <FilePlus2 size={18} strokeWidth={1.7} />
              </span>
              <h2 className="font-kai text-[22px] md:text-[25px]" style={{ color: '#34271c', letterSpacing: '0.05em' }}>
                补充资料
              </h2>
            </div>

            <p className="max-w-[650px] font-kai text-[14px] leading-7 md:text-[15px]" style={{ color: '#786754' }}>
              发现遗漏的老师、院校或官网？欢迎提交线索。资料会由维护者核对后录入名录。
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: GraduationCap, label: '新增老师' },
                { icon: Building2, label: '补充院校' },
                { icon: Link2, label: '补充官网' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-kai text-[12px]"
                  style={{
                    color: '#705944',
                    backgroundColor: 'rgba(255,253,248,0.58)',
                    border: '1px solid rgba(139, 120, 87, 0.13)',
                  }}
                >
                  <Icon size={13} strokeWidth={1.7} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-kai text-[15px] transition-all hover:-translate-y-0.5 hover:opacity-90 md:mt-0 md:w-auto md:shrink-0"
            style={{
              color: '#fffdf7',
              backgroundColor: '#667653',
              border: '1px solid rgba(77, 92, 61, 0.48)',
              boxShadow: '0 8px 18px rgba(82, 98, 66, 0.2)',
              letterSpacing: '0.06em',
            }}
          >
            提交补充
            <ArrowRight size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </section>
  );
}
