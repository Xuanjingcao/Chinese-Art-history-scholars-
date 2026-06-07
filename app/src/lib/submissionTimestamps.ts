function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeDateInput(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return '';
}

export function pickSubmissionCreatedAt(record: Record<string, unknown>): string {
  return normalizeDateInput(record.createdAt)
    || normalizeDateInput(record._createTime)
    || normalizeDateInput(record.created_time)
    || readString(record.createdAt);
}

export function formatSubmissionTimestamp(
  value: string,
  mode: 'date' | 'datetime' = 'date',
): string {
  const normalized = readString(value).trim();
  if (!normalized) return '未记录时间';

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '未记录时间';

  return mode === 'datetime'
    ? date.toLocaleString('zh-CN')
    : date.toLocaleDateString('zh-CN');
}
