export interface BookmarkOwnershipRecord {
  userId?: unknown;
  _openid?: unknown;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function getBookmarkOwnerId(record: BookmarkOwnershipRecord): string {
  return readString(record.userId) || readString(record._openid);
}

export function isBookmarkOwnedByUser(record: BookmarkOwnershipRecord, userId: string): boolean {
  return getBookmarkOwnerId(record) === userId;
}
