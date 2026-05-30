import assert from 'node:assert/strict';
import {
  buildSubmissionDescription,
  getSubmissionTypeLabel,
  validateSubmissionDraft,
} from '../src/lib/submissionForm.ts';

assert.equal(getSubmissionTypeLabel('new_professor'), '新增老师');
assert.equal(getSubmissionTypeLabel('new_university'), '补充院校');
assert.equal(getSubmissionTypeLabel('website'), '补充官网');
assert.equal(getSubmissionTypeLabel('correction'), '更正信息');

assert.deepEqual(
  validateSubmissionDraft({
    type: 'new_professor',
    subject: '',
    university: '',
    website: '',
    researchAreas: '',
    details: '',
  }),
  ['请填写老师姓名', '请填写所属院校'],
);

assert.deepEqual(
  validateSubmissionDraft({
    type: 'website',
    subject: '清华大学美术学院',
    university: '',
    website: '',
    researchAreas: '',
    details: '',
  }),
  ['请填写官网链接'],
);

assert.equal(
  buildSubmissionDescription({
    type: 'new_professor',
    subject: '  张三 ',
    university: ' 清华大学 ',
    website: ' https://example.com/profile ',
    researchAreas: ' 中国绘画史、视觉文化 ',
    details: ' 补充说明 ',
  }),
  [
    '类型：新增老师',
    '老师姓名：张三',
    '所属院校：清华大学',
    '相关链接：https://example.com/profile',
    '研究方向：中国绘画史、视觉文化',
    '补充说明：补充说明',
  ].join('\n'),
);

console.log('submission form checks passed');
