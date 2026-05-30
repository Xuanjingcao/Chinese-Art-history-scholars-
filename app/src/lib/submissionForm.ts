export type SupplementSubmissionType =
  | 'new_professor'
  | 'new_university'
  | 'website'
  | 'correction';

export interface SubmissionDraft {
  type: SupplementSubmissionType;
  subject: string;
  university: string;
  website: string;
  researchAreas: string;
  details: string;
}

const typeLabels: Record<SupplementSubmissionType, string> = {
  new_professor: '新增老师',
  new_university: '补充院校',
  website: '补充官网',
  correction: '更正信息',
};

export function getSubmissionTypeLabel(type: SupplementSubmissionType) {
  return typeLabels[type];
}

export function validateSubmissionDraft(draft: SubmissionDraft) {
  const errors: string[] = [];

  if (!draft.subject.trim()) {
    errors.push(draft.type === 'new_professor' ? '请填写老师姓名' : '请填写补充对象');
  }

  if (draft.type === 'new_professor' && !draft.university.trim()) {
    errors.push('请填写所属院校');
  }

  if (draft.type === 'website' && !draft.website.trim()) {
    errors.push('请填写官网链接');
  }

  if (draft.type === 'correction' && !draft.details.trim()) {
    errors.push('请填写需要更正的内容');
  }

  return errors;
}

export function getSubmissionTitle(draft: SubmissionDraft) {
  return `${getSubmissionTypeLabel(draft.type)}：${draft.subject.trim()}`;
}

export function buildSubmissionDescription(draft: SubmissionDraft) {
  const subjectLabel = draft.type === 'new_professor' ? '老师姓名' : '补充对象';
  const rows = [
    `类型：${getSubmissionTypeLabel(draft.type)}`,
    `${subjectLabel}：${draft.subject.trim()}`,
    draft.university.trim() ? `所属院校：${draft.university.trim()}` : '',
    draft.website.trim() ? `相关链接：${draft.website.trim()}` : '',
    draft.researchAreas.trim() ? `研究方向：${draft.researchAreas.trim()}` : '',
    draft.details.trim() ? `补充说明：${draft.details.trim()}` : '',
  ];

  return rows.filter(Boolean).join('\n');
}
