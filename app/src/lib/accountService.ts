/**
 * Account Service — CloudBase Integration (prepared)
 *
 * PRIMARY DESIGN: userId = CloudBase anonymous identity
 *
 * Some existing records may have _openid from CloudBase anonymous/wechat login.
 * New web records also store userId for browser-compatible lookup.
 * username is stored as an auxiliary/display field only.
 *
 * AuthUser in localStorage:
 *   { userId: "cloudbase_identity", nickname: "昵称" }
 *
 * Strategy:
 *   1. Check if CloudBase is available (isCloudBaseAvailable)
 *   2. If YES → read/write from CloudBase collections, WHERE { userId }
 *   3. If NO  → fallback to mock data (client-side only, no persistence)
 *
 * ─── CloudBase Collections ──────────────────────────────────
 *
 * users (EXISTING — do NOT create new collection):
 *   _id, _openid (CloudBase auto), username, nickname,
 *   passwordHash, email?, avatar?, createdAt
 *
 * bookmarks:
 *   _id, userId (indexed) = _openid, username, type, targetId, targetName,
 *   targetDetail?, createdAt
 *
 * browsing_history:
 *   _id, userId (indexed) = _openid, username, professorId, professorName,
 *   university, title, specialties[], viewedAt
 *
 * notes:
 *   _id, userId (indexed) = _openid, username, professorId, professorName,
 *   content, createdAt, updatedAt
 *
 * submissions:
 *   _id, userId (indexed) = _openid, username, type, title, description,
 *   status, adminReply?, createdAt
 */

import { getDb, isCloudBaseAvailable } from './cloudbase.ts';
import type { CloudBaseRecord } from './cloudbase.ts';
import { getCurrentUser as authGetCurrentUser, logoutUser as authLogoutUser } from './auth.ts';
import {
  canRemoveBookmarkRecord,
  getBookmarkOwnerId,
} from './bookmarkOwnership.ts';
import {
  buildSubmissionDescription,
  getSubmissionTitle,
  type SubmissionDraft,
} from './submissionForm.ts';
import { pickSubmissionCreatedAt } from './submissionTimestamps.ts';
import {
  mockUser,
  mockBookmarks,
  mockBrowsingHistory,
  mockSubmissions,
  mockNotes,
  type MockUser,
  type Bookmark,
  type BrowsingRecord,
  type Submission,
  type Note,
} from './mockAccountData.ts';

// ─── Internal helpers ───────────────────────────────────────

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

let _useCloudBase: boolean | null = null;
const LOCAL_SUBMISSIONS_KEY = 'scholar_local_submissions';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getDocId(doc: CloudBaseRecord): string {
  return readString(doc._id);
}

function getLocalSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) as Submission[] : [];
  } catch {
    return [];
  }
}

function setLocalSubmissions(submissions: Submission[]) {
  localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(submissions));
}

function normalizeSubmission(submission: Submission): Submission {
  const adminReply = submission.adminReply?.trim();
  return {
    ...submission,
    adminReply: adminReply || undefined,
  };
}

function mergeSubmissionLists(...lists: Submission[][]): Submission[] {
  const map = new Map<string, Submission>();

  lists.flat().forEach((submission) => {
    map.set(submission.id, normalizeSubmission(submission));
  });

  return Array.from(map.values()).sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

export { canRemoveBookmarkRecord, getBookmarkOwnerId, isBookmarkOwnedByUser } from './bookmarkOwnership.ts';

async function shouldUseCloudBase(): Promise<boolean> {
  if (_useCloudBase !== null) return _useCloudBase;
  _useCloudBase = await isCloudBaseAvailable();
  return _useCloudBase;
}

// Resolve userId from auth system
function resolveNickname(): string {
  const u = authGetCurrentUser();
  return u?.nickname || '';
}

// ─── 1. getCurrentUser ──────────────────────────────────────

export async function getCurrentUser(): Promise<MockUser | null> {
  const authUser = authGetCurrentUser();
  if (!authUser || !authUser.userId) return null;

  // userId is the CloudBase browser identity stored by auth.ts
  const uid = authUser.userId;
  const useCb = await shouldUseCloudBase();

  if (useCb) {
    try {
      const db = await getDb();
      // Prefer userId for web auth, then fall back to legacy _openid records.
      const byUserId = await db.collection('users').where({ userId: uid }).limit(1).get();
      const res = byUserId.data.length > 0
        ? byUserId
        : await db.collection('users').where({ _openid: uid }).limit(1).get();
      if (res.data.length > 0) {
        const d = res.data[0];
        return {
          userId: uid,
          username: readString(d.username),
          nickname: authUser.nickname || readString(d.nickname, '用户'),
          email: readString(d.email),
          avatar: readString(d.avatar),
          createdAt: readString(d.createdAt),
        };
      }
    } catch (e) {
      console.warn('[AccountService] getCurrentUser CloudBase error:', getErrorMessage(e));
    }
  }

  // Fallback: return from localStorage with mock augmentation
  return delay({
    ...mockUser,
    userId: uid,
    username: '',
    nickname: authUser.nickname || '用户',
  });
}

// ─── 2. getBookmarks ────────────────────────────────────────

export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      const byUserId = await db.collection('bookmarks')
        .where({ userId })
        .orderBy('createdAt', 'desc')
        .get();

      const byOpenId = await db.collection('bookmarks')
        .where({ _openid: userId })
        .orderBy('createdAt', 'desc')
        .get();

      const merged = [...byUserId.data, ...byOpenId.data];
      const uniqueById = Array.from(
        new Map(merged.map((doc) => [getDocId(doc), doc])).values(),
      );

      return uniqueById.map((d) => ({
        id: getDocId(d),
        userId: getBookmarkOwnerId(d),
        type: readString(d.type) as Bookmark['type'],
        targetId: readString(d.targetId),
        targetName: readString(d.targetName),
        targetDetail: readString(d.targetDetail),
        createdAt: readString(d.createdAt),
      }));
    } catch (e) {
      console.warn('[AccountService] getBookmarks CloudBase error:', getErrorMessage(e));
    }
  }
  // Fallback: if userId doesn't match mock data's userId, return all mock data
  const mockUid = mockBookmarks[0]?.userId;
  return delay(mockUid && userId !== mockUid ? mockBookmarks : mockBookmarks.map((b) => ({ ...b, userId })));
}

// ─── 3. getBrowsingHistory ──────────────────────────────────

export async function getBrowsingHistory(userId: string): Promise<BrowsingRecord[]> {
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      const res = await db.collection('browsing_history')
        .where({ userId })
        .orderBy('viewedAt', 'desc')
        .limit(50)
        .get();
      return res.data.map((d) => ({
        id: getDocId(d),
        userId: readString(d.userId),
        professorId: readString(d.professorId),
        professorName: readString(d.professorName),
        university: readString(d.university),
        title: readString(d.title),
        specialties: readStringArray(d.specialties),
        viewedAt: readString(d.viewedAt),
      }));
    } catch (e) {
      console.warn('[AccountService] getBrowsingHistory CloudBase error:', getErrorMessage(e));
    }
  }
  const mockUid = mockBrowsingHistory[0]?.userId;
  return delay(mockUid && userId !== mockUid ? mockBrowsingHistory : mockBrowsingHistory.map((h) => ({ ...h, userId })));
}

// ─── 4. getNotes ────────────────────────────────────────────

export async function getNotes(userId: string): Promise<Note[]> {
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      const res = await db.collection('notes')
        .where({ userId })
        .orderBy('updatedAt', 'desc')
        .get();
      return res.data.map((d) => ({
        id: getDocId(d),
        userId: readString(d.userId),
        professorId: readString(d.professorId),
        professorName: readString(d.professorName),
        content: readString(d.content),
        createdAt: readString(d.createdAt),
        updatedAt: readString(d.updatedAt),
      }));
    } catch (e) {
      console.warn('[AccountService] getNotes CloudBase error:', getErrorMessage(e));
    }
  }
  const mockUid = mockNotes[0]?.userId;
  return delay(mockUid && userId !== mockUid ? mockNotes : mockNotes.map((n) => ({ ...n, userId })));
}

// ─── 5. getSubmissions ──────────────────────────────────────

export async function getSubmissions(userId: string): Promise<Submission[]> {
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      const res = await db.collection('submissions')
        .where({ userId })
        .orderBy('createdAt', 'desc')
        .get();
      return res.data.map((d) => ({
        id: getDocId(d),
        userId: readString(d.userId),
        type: readString(d.type) as Submission['type'],
        title: readString(d.title),
        description: readString(d.description),
        status: readString(d.status) as Submission['status'],
        adminReply: readString(d.adminReply),
        createdAt: pickSubmissionCreatedAt(d),
      }));
    } catch (e) {
      console.warn('[AccountService] getSubmissions CloudBase error:', getErrorMessage(e));
    }
  }
  const localSubmissions = getLocalSubmissions().filter((submission) => submission.userId === userId);
  const mockUid = mockSubmissions[0]?.userId;
  const mockData = mockUid && userId !== mockUid ? mockSubmissions : mockSubmissions.map((s) => ({ ...s, userId }));
  return delay(mergeSubmissionLists(mockData, localSubmissions));
}

export async function createSubmission(userId: string, draft: SubmissionDraft): Promise<Submission | null> {
  const useCb = await shouldUseCloudBase();
  const uname = resolveNickname();
  const createdAt = new Date().toISOString();
  const submissionData = {
    userId,
    username: uname,
    type: draft.type,
    title: getSubmissionTitle(draft),
    description: buildSubmissionDescription(draft),
    status: 'pending' as const,
    createdAt,
  };

  if (useCb) {
    try {
      const db = await getDb();
      const doc = await db.collection('submissions').add(submissionData);
      return {
        id: readString(doc.id),
        ...submissionData,
      };
    } catch (e) {
      console.warn('[AccountService] createSubmission CloudBase error:', getErrorMessage(e));
      return null;
    }
  }

  const submission: Submission = {
    id: `sb_${Date.now()}`,
    ...submissionData,
  };
  setLocalSubmissions([submission, ...getLocalSubmissions()]);
  return delay(submission, 100);
}

export async function getAdminSubmissions(): Promise<Submission[]> {
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      const res = await db.collection('submissions')
        .orderBy('createdAt', 'desc')
        .get();
      return res.data.map((d) => ({
        id: getDocId(d),
        userId: readString(d.userId),
        type: readString(d.type) as Submission['type'],
        title: readString(d.title),
        description: readString(d.description),
        status: readString(d.status) as Submission['status'],
        adminReply: readString(d.adminReply),
        createdAt: pickSubmissionCreatedAt(d),
      }));
    } catch (e) {
      console.warn('[AccountService] getAdminSubmissions CloudBase error:', getErrorMessage(e));
    }
  }

  return delay(mergeSubmissionLists(mockSubmissions, getLocalSubmissions()));
}

export async function reviewSubmission(
  submissionId: string,
  status: Submission['status'],
  adminReply: string,
): Promise<Submission | null> {
  if (status === 'pending') return null;

  const normalizedReply = adminReply.trim();
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      const doc = await db.collection('submissions').doc(submissionId).get();
      const record = doc.data;
      if (!record) return null;

      await db.collection('submissions').doc(submissionId).update({
        status,
        adminReply: normalizedReply,
      });

      return {
        id: submissionId,
        userId: readString(record.userId),
        type: readString(record.type) as Submission['type'],
        title: readString(record.title),
        description: readString(record.description),
        status,
        adminReply: normalizedReply || undefined,
        createdAt: pickSubmissionCreatedAt(record),
      };
    } catch (e) {
      console.warn('[AccountService] reviewSubmission CloudBase error:', getErrorMessage(e));
      return null;
    }
  }

  const merged = mergeSubmissionLists(mockSubmissions, getLocalSubmissions());
  const target = merged.find((submission) => submission.id === submissionId);
  if (!target) return delay(null, 100);

  const updated: Submission = {
    ...target,
    status,
    adminReply: normalizedReply || undefined,
  };
  setLocalSubmissions(merged.map((submission) => (submission.id === submissionId ? updated : submission)));
  return delay(updated, 100);
}

// ─── 6. updateProfile ───────────────────────────────────────

export async function updateProfile(
  userId: string,
  data: Partial<Pick<MockUser, 'nickname' | 'email'>>,
): Promise<boolean> {
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      // Prefer userId for web auth, then fall back to legacy _openid records.
      const byUserId = await db.collection('users').where({ userId }).limit(1).get();
      const res = byUserId.data.length > 0
        ? byUserId
        : await db.collection('users').where({ _openid: userId }).limit(1).get();
      if (res.data.length > 0) {
        await db.collection('users').doc(getDocId(res.data[0])).update({
          ...data,
          updatedAt: new Date().toISOString(),
        });
        return true;
      }
    } catch (e) {
      console.warn('[AccountService] updateProfile CloudBase error:', getErrorMessage(e));
    }
    return false;
  }
  console.log('[AccountService][Mock] updateProfile:', userId, data);
  return delay(true, 100);
}

// ─── 7. logout ──────────────────────────────────────────────

export async function logout(): Promise<void> {
  authLogoutUser();
}

// ─── Extended: record browsing ──────────────────────────────

export async function recordBrowsing(
  userId: string,
  data: Omit<BrowsingRecord, 'id' | 'userId' | 'viewedAt'>,
): Promise<boolean> {
  const useCb = await shouldUseCloudBase();
  const uname = resolveNickname();
  if (useCb) {
    try {
      const db = await getDb();
      const existing = await db.collection('browsing_history')
        .where({ userId, professorId: data.professorId })
        .limit(1)
        .get();
      const now = new Date().toISOString();
      if (existing.data.length > 0) {
        await db.collection('browsing_history').doc(getDocId(existing.data[0])).update({
          viewedAt: now,
          professorName: data.professorName,
          university: data.university,
          title: data.title,
          specialties: data.specialties,
        });
      } else {
        await db.collection('browsing_history').add({
          userId,
          username: uname,
          ...data,
          viewedAt: now,
        });
      }
      return true;
    } catch (e) {
      console.warn('[AccountService] recordBrowsing CloudBase error:', getErrorMessage(e));
      return false;
    }
  }
  return delay(true, 100);
}

// ─── Extended: clear browsing history ───────────────────────

export async function clearBrowsingHistory(userId: string): Promise<boolean> {
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      const res = await db.collection('browsing_history').where({ userId }).get();
      for (const doc of res.data) {
        await db.collection('browsing_history').doc(getDocId(doc)).remove();
      }
      return true;
    } catch (e) {
      console.warn('[AccountService] clearBrowsingHistory CloudBase error:', getErrorMessage(e));
      return false;
    }
  }
  return delay(true, 100);
}

// ─── Extended: bookmark add/remove ──────────────────────────

export async function addBookmark(
  userId: string,
  data: Omit<Bookmark, 'id' | 'userId'>,
): Promise<Bookmark | null> {
  const useCb = await shouldUseCloudBase();
  const uname = resolveNickname();
  if (useCb) {
    try {
      const db = await getDb();
      const doc = await db.collection('bookmarks').add({
        userId,
        username: uname,
        type: data.type,
        targetId: data.targetId,
        targetName: data.targetName,
        targetDetail: data.targetDetail || '',
        createdAt: new Date().toISOString(),
      });
      return { id: readString(doc.id), userId, ...data };
    } catch (e) {
      console.warn('[AccountService] addBookmark CloudBase error:', getErrorMessage(e));
      return null;
    }
  }
  return delay({ id: `bk_${Date.now()}`, userId, ...data });
}

export async function removeBookmark(userId: string, bookmarkId: string): Promise<boolean> {
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      const doc = await db.collection('bookmarks').doc(bookmarkId).get();
      if (doc.data && canRemoveBookmarkRecord(doc.data, userId)) {
        await db.collection('bookmarks').doc(bookmarkId).remove();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[AccountService] removeBookmark CloudBase error:', getErrorMessage(e));
      return false;
    }
  }
  return delay(true, 100);
}

// ─── Extended: note save/delete ─────────────────────────────

export async function saveNote(
  userId: string,
  professorId: string,
  professorName: string,
  content: string,
): Promise<Note | null> {
  const useCb = await shouldUseCloudBase();
  const uname = resolveNickname();
  const now = new Date().toISOString();
  if (useCb) {
    try {
      const db = await getDb();
      const existing = await db.collection('notes')
        .where({ userId, professorId })
        .limit(1)
        .get();
      if (existing.data.length > 0) {
        const docId = getDocId(existing.data[0]);
        await db.collection('notes').doc(docId).update({ content, updatedAt: now });
        return {
          id: docId,
          userId,
          professorId,
          professorName,
          content,
          createdAt: readString(existing.data[0].createdAt),
          updatedAt: now,
        };
      } else {
        const doc = await db.collection('notes').add({
          userId,
          username: uname,
          professorId,
          professorName,
          content,
          createdAt: now,
          updatedAt: now,
        });
        return {
          id: readString(doc.id),
          userId,
          professorId,
          professorName,
          content,
          createdAt: now,
          updatedAt: now,
        };
      }
    } catch (e) {
      console.warn('[AccountService] saveNote CloudBase error:', getErrorMessage(e));
      return null;
    }
  }
  return delay({
    id: `nt_${Date.now()}`,
    userId,
    professorId,
    professorName,
    content,
    createdAt: now,
    updatedAt: now,
  });
}

export async function deleteNote(userId: string, noteId: string): Promise<boolean> {
  const useCb = await shouldUseCloudBase();
  if (useCb) {
    try {
      const db = await getDb();
      const doc = await db.collection('notes').doc(noteId).get();
      if (doc.data && readString(doc.data.userId) === userId) {
        await db.collection('notes').doc(noteId).remove();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[AccountService] deleteNote CloudBase error:', getErrorMessage(e));
      return false;
    }
  }
  return delay(true, 100);
}
