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

export function canRemoveBookmarkRecord(record: BookmarkOwnershipRecord, userId: string): boolean {
  const ownerId = getBookmarkOwnerId(record);
  if (!ownerId) return true;
  return ownerId === userId;
}
