import assert from 'node:assert/strict';
import { buildProfessorDraftFromSubmission } from '../src/lib/submissionDraftConversion.ts';

const draft = buildProfessorDraftFromSubmission({
  title: '新增老师：张书彬',
  type: 'new_professor',
  description: [
    '类型：新增老师',
    '老师姓名：张书彬',
    '所属院校：中国美术学院',
    '相关链接：https://www.caa.edu.cn/sz/zzfjs/zhangshubin/zyjl.htm',
    '研究方向：佛教艺术、中国美术史',
    '补充说明：长期研究佛教艺术与视觉文化。',
  ].join('\n'),
});

assert.equal(draft.name, '张书彬');
assert.equal(draft.university, '中国美术学院');
assert.deepEqual(draft.specialties, ['佛教艺术', '中国美术史']);
assert.equal(draft.profileLink, 'https://www.caa.edu.cn/sz/zzfjs/zhangshubin/zyjl.htm');
assert.equal(
  draft.bio,
  '长期研究佛教艺术与视觉文化。\n\n来源：用户补充 submission（新增老师：张书彬）',
);

const fallbackDraft = buildProfessorDraftFromSubmission({
  title: '新增老师：何碧琪',
  type: 'new_professor',
  description: '老师姓名：何碧琪\n所属院校：香港中文大学',
});

assert.equal(fallbackDraft.name, '何碧琪');
assert.equal(fallbackDraft.university, '香港中文大学');
assert.deepEqual(fallbackDraft.specialties, []);
assert.equal(fallbackDraft.profileLink, '');
assert.equal(
  fallbackDraft.bio,
  '来源：用户补充 submission（新增老师：何碧琪）',
);

console.log('submission draft conversion checks passed');
