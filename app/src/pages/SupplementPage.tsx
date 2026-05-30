import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FilePenLine,
  GraduationCap,
  Link2,
  Send,
} from 'lucide-react';
import { createSubmission } from '@/lib/accountService';
import {
  getSubmissionTypeLabel,
  validateSubmissionDraft,
  type SubmissionDraft,
  type SupplementSubmissionType,
} from '@/lib/submissionForm';

const typeOptions: {
  type: SupplementSubmissionType;
  description: string;
  icon: typeof GraduationCap;
}[] = [
  { type: 'new_professor', description: '提交遗漏老师及其研究信息', icon: GraduationCap },
  { type: 'new_university', description: '补充尚未收录的院校或学院', icon: Building2 },
  { type: 'website', description: '补充老师、学院或机构官网', icon: Link2 },
  { type: 'correction', description: '反馈现有资料中的错误或更新', icon: FilePenLine },
];

const emptyDraft: SubmissionDraft = {
  type: 'new_professor',
  subject: '',
  university: '',
  website: '',
  researchAreas: '',
  details: '',
};

function FormField({
  label,
  value,
  placeholder,
  required = false,
  textarea = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  textarea?: boolean;
  onChange: (value: string) => void;
}) {
  const commonProps = {
    value,
    placeholder,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    className: 'w-full rounded-xl px-4 py-3 font-kai text-[15px] outline-none transition-shadow focus:ring-2 focus:ring-[rgba(102,118,83,0.18)]',
    style: {
      color: '#34271c',
      backgroundColor: 'rgba(255,253,248,0.82)',
      border: '1px solid rgba(139, 120, 87, 0.2)',
    },
  };

  return (
    <label className="block">
      <span className="mb-2 block font-kai text-[13px]" style={{ color: '#6f5e4c' }}>
        {label}
        {required && <em className="ml-1 not-italic" style={{ color: '#b03528' }}>*</em>}
      </span>
      {textarea ? <textarea {...commonProps} rows={5} /> : <input {...commonProps} type="text" />}
    </label>
  );
}

export default function SupplementPage({
  userId,
  nickname,
  onBack,
  onViewAccount,
}: {
  userId: string;
  nickname: string;
  onBack: () => void;
  onViewAccount: () => void;
}) {
  const [draft, setDraft] = useState<SubmissionDraft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateDraft = (patch: Partial<SubmissionDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors([]);
  };

  const handleSubmit = async () => {
    const nextErrors = validateSubmissionDraft(draft);
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    const created = await createSubmission(userId, draft);
    setIsSubmitting(false);

    if (!created) {
      setErrors(['提交失败，请稍后重试']);
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-[58vh] max-w-[760px] items-center px-4 py-10 md:px-6">
        <div
          className="w-full rounded-[22px] px-6 py-10 text-center md:px-10"
          style={{
            backgroundColor: 'rgba(252, 248, 240, 0.88)',
            border: '1px solid rgba(139, 120, 87, 0.18)',
            boxShadow: '0 16px 38px rgba(56, 44, 30, 0.08)',
          }}
        >
          <span
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ color: '#5f7755', backgroundColor: 'rgba(95,119,85,0.1)' }}
          >
            <CheckCircle2 size={28} strokeWidth={1.6} />
          </span>
          <h1 className="font-serif text-2xl md:text-3xl" style={{ color: '#34271c', letterSpacing: '0.08em' }}>
            已收到你的补充
          </h1>
          <p className="mx-auto mt-4 max-w-[520px] font-kai text-sm leading-7" style={{ color: '#786754' }}>
            感谢你帮忙完善名录。维护者核对资料后，会在“我的补充”中更新处理状态。
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setDraft(emptyDraft);
                setSubmitted(false);
              }}
              className="rounded-xl px-5 py-3 font-kai text-sm"
              style={{ color: '#5c4030', backgroundColor: 'rgba(92,64,48,0.08)', border: '1px solid rgba(92,64,48,0.14)' }}
            >
              再补充一条
            </button>
            <button
              type="button"
              onClick={onViewAccount}
              className="rounded-xl px-5 py-3 font-kai text-sm"
              style={{ color: '#fffdf7', backgroundColor: '#667653', border: '1px solid rgba(77,92,61,0.48)' }}
            >
              查看我的补充
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8 md:px-6 md:py-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-7 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-kai text-sm transition-opacity hover:opacity-75"
        style={{ color: '#5c4030', backgroundColor: 'rgba(250,247,240,0.86)', border: '1px solid rgba(92,64,48,0.16)' }}
      >
        <ArrowLeft size={16} strokeWidth={1.7} />
        返回首页
      </button>

      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl" style={{ color: '#34271c', letterSpacing: '0.08em' }}>
          补充资料
        </h1>
        <p className="mt-3 font-kai text-sm leading-7 md:text-[15px]" style={{ color: '#786754' }}>
          {nickname}，欢迎提交学者与院校线索。资料会由维护者核对后录入名录，不会直接覆盖现有内容。
        </p>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {typeOptions.map(({ type, description, icon: Icon }) => {
          const active = draft.type === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => updateDraft({ ...emptyDraft, type })}
              className="flex items-start gap-3 rounded-[16px] px-4 py-4 text-left transition-transform active:scale-[0.99]"
              style={{
                backgroundColor: active ? 'rgba(102,118,83,0.14)' : 'rgba(252,248,240,0.78)',
                border: active ? '1px solid rgba(102,118,83,0.38)' : '1px solid rgba(139,120,87,0.16)',
                boxShadow: active ? '0 8px 18px rgba(82,98,66,0.1)' : '0 5px 14px rgba(56,44,30,0.04)',
              }}
            >
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ color: active ? '#58694a' : '#856d54', backgroundColor: 'rgba(255,253,248,0.68)' }}
              >
                <Icon size={19} strokeWidth={1.7} />
              </span>
              <span>
                <strong className="block font-kai text-[16px] font-normal" style={{ color: '#34271c' }}>
                  {getSubmissionTypeLabel(type)}
                </strong>
                <span className="mt-1 block font-kai text-[12px] leading-5" style={{ color: '#897763' }}>
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <section
        className="rounded-[20px] px-5 py-6 md:px-7 md:py-7"
        style={{
          backgroundColor: 'rgba(252,248,240,0.86)',
          border: '1px solid rgba(139,120,87,0.17)',
          boxShadow: '0 14px 30px rgba(56,44,30,0.06)',
        }}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            label={draft.type === 'new_professor' ? '老师姓名' : '补充对象'}
            value={draft.subject}
            placeholder={draft.type === 'new_professor' ? '请输入老师姓名' : '请输入院校、学院或老师名称'}
            required
            onChange={(subject) => updateDraft({ subject })}
          />
          {(draft.type === 'new_professor' || draft.type === 'website' || draft.type === 'correction') && (
            <FormField
              label="所属院校"
              value={draft.university}
              placeholder="请输入学校或学院名称"
              required={draft.type === 'new_professor'}
              onChange={(university) => updateDraft({ university })}
            />
          )}
          <FormField
            label={draft.type === 'website' ? '官网链接' : '相关链接'}
            value={draft.website}
            placeholder="可填写官网、个人主页或权威资料链接"
            required={draft.type === 'website'}
            onChange={(website) => updateDraft({ website })}
          />
          {(draft.type === 'new_professor' || draft.type === 'correction') && (
            <FormField
              label="研究方向"
              value={draft.researchAreas}
              placeholder="例如：中国绘画史、视觉文化"
              onChange={(researchAreas) => updateDraft({ researchAreas })}
            />
          )}
        </div>

        <div className="mt-5">
          <FormField
            label={draft.type === 'correction' ? '需要更正的内容' : '补充说明'}
            value={draft.details}
            placeholder="请补充有助于核对的信息，例如职称、院系、资料出处或更正原因"
            required={draft.type === 'correction'}
            textarea
            onChange={(details) => updateDraft({ details })}
          />
        </div>

        {errors.length > 0 && (
          <div className="mt-4 rounded-xl px-4 py-3" style={{ color: '#a13b31', backgroundColor: 'rgba(176,53,48,0.06)' }}>
            {errors.map((error) => (
              <p key={error} className="font-kai text-[13px] leading-6">{error}</p>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'rgba(139,120,87,0.14)' }}>
          <p className="font-kai text-[12px] leading-5" style={{ color: '#927f6b' }}>
            提交后进入审核队列，你可以在“我的补充”中查看处理进度。
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 font-kai text-[15px] transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ color: '#fffdf7', backgroundColor: '#667653', border: '1px solid rgba(77,92,61,0.48)' }}
          >
            {isSubmitting ? '提交中...' : '提交补充'}
            {isSubmitting ? <Send size={15} /> : <ArrowRight size={15} />}
          </button>
        </div>
      </section>
    </main>
  );
}
