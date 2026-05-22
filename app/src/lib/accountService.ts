/**
 * Account Service — CloudBase Integration (prepared)
 *
 * PRIMARY DESIGN: userId = CloudBase _openid
 *
 * The existing 'users' collection has _openid from CloudBase anonymous/wechat login.
 * We map _openid as userId for all user-related collections.
 * username is stored as an auxiliary/display field only.
 *
 * AuthUser in localStorage:
 *   { userId: "_openid_value", nickname: "昵称" }
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

import { getDb, isCloudBaseAvailable } from './cloudbase';
import { getCurrentUser as authGetCurrentUser, logoutUser as authLogoutUser } from './auth';
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
} from './mockAccountData';

// ─── Internal helpers ───────────────────────────────────────

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

let _useCloudBase: boolean | null = null;

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

  // userId is already the _openid from CloudBase, stored in localStorage by auth.ts
  const uid = authUser.userId;
  const useCb = await shouldUseCloudBase();

  if (useCb) {
    try {
      const db = await getDb();
      // Lookup user profile from EXISTING users collection by _openid
      const res = await db.collection('users').where({ _openid: uid }).limit(1).get();
      if (res.data.length > 0) {
        const d = res.data[0] as any;
        return {
          userId: uid,
          username: d.username,
          nickname: d.nickname,
          email: d.email || '',
          avatar: d.avatar || '',
          createdAt: d.createdAt,
        };
      }
    } catch (e: any) {
      console.warn('[AccountService] getCurrentUser CloudBase error:', e.message);
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
      const res = await db.collection('bookmarks')
        .where({ userId })
        .orderBy('createdAt', 'desc')
        .get();
      return (res.data as any[]).map((d) => ({
        id: d._id,
        userId: d.userId,
        type: d.type,
        targetId: d.targetId,
        targetName: d.targetName,
        targetDetail: d.targetDetail,
        createdAt: d.createdAt,
      }));
    } catch (e: any) {
      console.warn('[AccountService] getBookmarks CloudBase error:', e.message);
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
      return (res.data as any[]).map((d) => ({
        id: d._id,
        userId: d.userId,
        professorId: d.professorId,
        professorName: d.professorName,
        university: d.university,
        title: d.title,
        specialties: d.specialties || [],
        viewedAt: d.viewedAt,
      }));
    } catch (e: any) {
      console.warn('[AccountService] getBrowsingHistory CloudBase error:', e.message);
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
      return (res.data as any[]).map((d) => ({
        id: d._id,
        userId: d.userId,
        professorId: d.professorId,
        professorName: d.professorName,
        content: d.content,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    } catch (e: any) {
      console.warn('[AccountService] getNotes CloudBase error:', e.message);
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
      return (res.data as any[]).map((d) => ({
        id: d._id,
        userId: d.userId,
        type: d.type,
        title: d.title,
        description: d.description,
        status: d.status,
        adminReply: d.adminReply,
        createdAt: d.createdAt,
      }));
    } catch (e: any) {
      console.warn('[AccountService] getSubmissions CloudBase error:', e.message);
    }
  }
  const mockUid = mockSubmissions[0]?.userId;
  return delay(mockUid && userId !== mockUid ? mockSubmissions : mockSubmissions.map((s) => ({ ...s, userId })));
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
      // userId === _openid, query EXISTING users collection by _openid
      const res = await db.collection('users').where({ _openid: userId }).limit(1).get();
      if (res.data.length > 0) {
        await db.collection('users').doc(res.data[0]._id).update({
          ...data,
          updatedAt: new Date().toISOString(),
        });
        return true;
      }
    } catch (e: any) {
      console.warn('[AccountService] updateProfile CloudBase error:', e.message);
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
        await db.collection('browsing_history').doc(existing.data[0]._id).update({
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
    } catch (e: any) {
      console.warn('[AccountService] recordBrowsing CloudBase error:', e.message);
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
        await db.collection('browsing_history').doc(doc._id).remove();
      }
      return true;
    } catch (e: any) {
      console.warn('[AccountService] clearBrowsingHistory CloudBase error:', e.message);
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
      return { id: doc.id as string, userId, ...data };
    } catch (e: any) {
      console.warn('[AccountService] addBookmark CloudBase error:', e.message);
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
      if (doc.data && (doc.data as any).userId === userId) {
        await db.collection('bookmarks').doc(bookmarkId).remove();
        return true;
      }
      return false;
    } catch (e: any) {
      console.warn('[AccountService] removeBookmark CloudBase error:', e.message);
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
        const docId = existing.data[0]._id;
        await db.collection('notes').doc(docId).update({ content, updatedAt: now });
        return {
          id: docId,
          userId,
          professorId,
          professorName,
          content,
          createdAt: (existing.data[0] as any).createdAt,
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
          id: doc.id as string,
          userId,
          professorId,
          professorName,
          content,
          createdAt: now,
          updatedAt: now,
        };
      }
    } catch (e: any) {
      console.warn('[AccountService] saveNote CloudBase error:', e.message);
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
      if (doc.data && (doc.data as any).userId === userId) {
        await db.collection('notes').doc(noteId).remove();
        return true;
      }
      return false;
    } catch (e: any) {
      console.warn('[AccountService] deleteNote CloudBase error:', e.message);
      return false;
    }
  }
  return delay(true, 100);
}
