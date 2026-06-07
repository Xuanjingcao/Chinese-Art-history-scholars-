import type { ProfessorRecord } from '@/types';
import type { Submission } from './mockAccountData.ts';

type DraftSubmission = Pick<Submission, 'title' | 'type' | 'description'>;
type ProfessorDraftSeed = Pick<ProfessorRecord, 'name' | 'university' | 'specialties' | 'profileLink' | 'bio'>;

function readLabeledValue(description: string, label: string): string {
  const match = description.match(new RegExp(`${label}：([^\\n]+)`));
  return match?.[1]?.trim() ?? '';
}

function splitListValue(value: string): string[] {
  return value
    .split(/[、，,；;\n]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickName(submission: DraftSubmission): string {
  return readLabeledValue(submission.description, '老师姓名')
    || submission.title.replace(/^新增老师：/, '').trim();
}

function buildSourceNote(submission: DraftSubmission): string {
  return `来源：用户补充 submission（${submission.title.trim()}）`;
}

export function buildProfessorDraftFromSubmission(
  submission: DraftSubmission,
  base: ProfessorRecord,
): ProfessorRecord;
export function buildProfessorDraftFromSubmission(
  submission: DraftSubmission,
): ProfessorDraftSeed;
export function buildProfessorDraftFromSubmission(
  submission: DraftSubmission,
  base?: ProfessorRecord,
): ProfessorRecord | ProfessorDraftSeed {
  const name = pickName(submission);
  const university = readLabeledValue(submission.description, '所属院校');
  const specialties = splitListValue(readLabeledValue(submission.description, '研究方向'));
  const profileLink = readLabeledValue(submission.description, '相关链接');
  const details = readLabeledValue(submission.description, '补充说明');
  const sourceNote = buildSourceNote(submission);
  const bio = details ? `${details}\n\n${sourceNote}` : sourceNote;

  if (!base) {
    return {
      name,
      university,
      specialties,
      profileLink,
      bio,
    };
  }

  return {
    ...base,
    name,
    university,
    specialties,
    profileLink,
    bio,
  };
}
