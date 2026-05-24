/**
 * Authentication — CloudBase _openid based (v2 API)
 *
 * User identity = CloudBase anonymous auth id.
 * No password. CloudBase Auth IS the authentication.
 *
 * users collection stores profile only:
 *   { userId, _openid?, nickname, email?, avatar?, authProvider, createdAt, updatedAt }
 */

import { getDb, getOpenId } from './cloudbase';
import type { CloudBaseRecord } from './cloudbase';

export interface AuthUser {
  userId: string;   // = CloudBase anonymous identity
  nickname: string;
}

const CURRENT_USER_KEY = 'scholar_current_user';
const LOCAL_USER_ID_KEY = 'scholar_local_user_id';
const LOCAL_PROFILE_KEY = 'scholar_local_profile';
const OPENID_TIMEOUT_MS = 2500;

interface NeedRegisterError extends Error {
  userId?: string;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AuthUser>;
  return typeof data.userId === 'string' && typeof data.nickname === 'string';
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

async function getOpenIdWithTimeout(): Promise<string | null> {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      getOpenId(),
      new Promise<null>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(null), OPENID_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

function getLocalUserId(): string {
  let userId = localStorage.getItem(LOCAL_USER_ID_KEY);
  if (!userId) {
    const randomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    userId = `local_${randomId}`;
    localStorage.setItem(LOCAL_USER_ID_KEY, userId);
  }
  return userId;
}

function getLocalProfile(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isAuthUser(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLocalProfile(user: AuthUser): void {
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(user));
}

/** Find user profile by current CloudBase identity. */
async function findUserByOpenId(openId: string): Promise<CloudBaseRecord | null> {
  try {
    const db = await getDb();
    const byUserId = await db.collection('users').where({ userId: openId }).limit(1).get();
    if (byUserId.data.length > 0) return byUserId.data[0];

    const byOpenId = await db.collection('users').where({ _openid: openId }).limit(1).get();
    return byOpenId.data.length > 0 ? byOpenId.data[0] : null;
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

  const openId = await getOpenIdWithTimeout();
  if (!openId) {
    const user: AuthUser = { userId: getLocalUserId(), nickname: trimmed };
    saveLocalProfile(user);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }

  const existing = await findUserByOpenId(openId);
  const now = new Date().toISOString();

  if (existing) {
    const db = await getDb();
    await db.collection('users').doc(readString(existing._id)).update({
      nickname: trimmed,
      updatedAt: now,
    });
  } else {
    const db = await getDb();
    await db.collection('users').add({
      userId: openId,
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
  const openId = await getOpenIdWithTimeout();
  if (!openId) {
    const existing = getLocalProfile();
    if (existing) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existing));
      return existing;
    }

    const error = new Error('NEED_REGISTER') as NeedRegisterError;
    error.userId = getLocalUserId();
    throw error;
  }

  const existing = await findUserByOpenId(openId);
  if (!existing) {
    const error = new Error('NEED_REGISTER') as NeedRegisterError;
    error.userId = openId; // expose openid for UI
    throw error;
  }

  const user: AuthUser = {
    userId: openId,
    nickname: typeof existing.nickname === 'string' ? existing.nickname : '用户',
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Migrate old format: if only username exists (no real userId/openid), clear stale data
    // so the user re-authenticates and gets a proper openid-based userId
    if (!parsed.userId && parsed.username) {
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
    if (!parsed.userId) return null;
    return {
      userId: readString(parsed.userId),
      nickname: readString(parsed.nickname, '用户'),
    };
  } catch { return null; }
}

export function logoutUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export async function getCurrentUserId(): Promise<string | null> {
  return (await getOpenIdWithTimeout()) || getLocalUserId();
}
