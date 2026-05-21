/**
 * Authentication — CloudBase _openid based (v2 API)
 *
 * User identity = CloudBase anonymous auth openid.
 * No password. CloudBase Auth IS the authentication.
 *
 * users collection stores profile only:
 *   { _openid, nickname, email?, avatar?, authProvider, createdAt, updatedAt }
 */

import { db, getOpenId } from './cloudbase';

export interface AuthUser {
  userId: string;   // = CloudBase openid
  nickname: string;
}

const CURRENT_USER_KEY = 'scholar_current_user';

/** Find user profile by _openid in existing users collection */
async function findUserByOpenId(openId: string): Promise<any | null> {
  try {
    const res = await db.collection('users').where({ _openid: openId }).limit(1).get();
    return res.data.length > 0 ? res.data[0] : null;
  } catch {
    return null;
  }
}

/**
 * Register: create profile for current openid.
 * Reuses existing doc if _openid already present.
 */
export async function registerUser(nickname: string): Promise<AuthUser> {
  const trimmed = nickname.trim();
  if (!trimmed) throw new Error('昵称不能为空');

  const openId = await getOpenId();
  if (!openId) throw new Error('无法获取用户标识，请检查 CloudBase 配置');

  const existing = await findUserByOpenId(openId);
  const now = new Date().toISOString();

  if (existing) {
    await db.collection('users').doc(existing._id).update({
      nickname: trimmed,
      updatedAt: now,
    });
  } else {
    await db.collection('users').add({
      _openid: openId,
      nickname: trimmed,
      authProvider: 'anonymous',
      createdAt: now,
      updatedAt: now,
    });
  }

  const user: AuthUser = { userId: openId, nickname: trimmed };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

/**
 * Login: check if current openid has a profile.
 * Returns user if registered, throws NEED_REGISTER if not.
 */
export async function loginUser(): Promise<AuthUser> {
  const openId = await getOpenId();
  if (!openId) throw new Error('无法获取用户标识');

  const existing = await findUserByOpenId(openId);
  if (!existing) {
    const error = new Error('NEED_REGISTER');
    (error as any).userId = openId; // expose openid for UI
    throw error;
  }

  const user: AuthUser = {
    userId: openId,
    nickname: existing.nickname || '用户',
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migrate old format: if only username exists (no real userId/openid), clear stale data
    // so the user re-authenticates and gets a proper openid-based userId
    if (!parsed.userId && parsed.username) {
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
    if (!parsed.userId) return null;
    return { userId: parsed.userId, nickname: parsed.nickname || '用户' };
  } catch { return null; }
}

export function logoutUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export async function getCurrentUserId(): Promise<string | null> {
  return getOpenId();
}
