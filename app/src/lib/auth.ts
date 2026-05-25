/**
 * Authentication — legacy nickname/password users collection.
 *
 * This restores the original Kimi-era flow:
 *   users collection stores { nickname, username?, passwordHash, _openid?, userId? }
 *
 * CloudBase anonymous auth is still used underneath so browser requests have a
 * CloudBase identity, but the user-facing login is nickname + password.
 */

import { getDb, getOpenId } from './cloudbase';
import type { CloudBaseRecord } from './cloudbase';

export interface AuthUser {
  userId: string;
  nickname: string;
}

const CURRENT_USER_KEY = 'scholar_current_user';
const LOCAL_USER_ID_KEY = 'scholar_local_user_id';
const OPENID_TIMEOUT_MS = 2500;

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

function legacyPasswordHash(password: string): string {
  // Matches the old Kimi-generated weak hash format, e.g. "123456" -> "nzmv6r6".
  let hash = 0;
  for (let i = 0; i < password.length; i += 1) {
    hash = ((hash << 5) - hash) + password.charCodeAt(i);
    hash |= 0;
  }
  return `${Math.abs(hash).toString(36)}${password.length}`;
}

function passwordMatches(inputPassword: string, storedHash: string): boolean {
  if (!storedHash) return false;
  return storedHash === legacyPasswordHash(inputPassword) || storedHash === inputPassword;
}

function recordToAuthUser(record: CloudBaseRecord): AuthUser {
  const fallbackId = readString(record._id) || getLocalUserId();
  return {
    userId: readString(record.userId) || readString(record._openid) || fallbackId,
    nickname: readString(record.nickname) || readString(record.username, '用户'),
  };
}

async function findUserByNickname(nickname: string): Promise<CloudBaseRecord | null> {
  try {
    const db = await getDb();
    const byNickname = await db.collection('users').where({ nickname }).limit(1).get();
    if (byNickname.data.length > 0) return byNickname.data[0];

    const byUsername = await db.collection('users').where({ username: nickname }).limit(1).get();
    return byUsername.data.length > 0 ? byUsername.data[0] : null;
  } catch {
    return null;
  }
}

/**
 * Register a legacy nickname/password account.
 */
export async function registerUser(nickname: string, password: string): Promise<AuthUser> {
  const trimmed = nickname.trim();
  if (!trimmed) throw new Error('昵称不能为空');
  if (trimmed.length > 20) throw new Error('昵称不超过20个字');
  if (password.length < 6) throw new Error('密码至少6位');

  const openId = await getOpenIdWithTimeout();
  if (!openId) {
    const user: AuthUser = { userId: getLocalUserId(), nickname: trimmed };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }

  const existing = await findUserByNickname(trimmed);
  if (existing) throw new Error('这个昵称已经被注册');

  const now = new Date().toISOString();
  const db = await getDb();
  await db.collection('users').add({
    userId: openId,
    username: trimmed,
    nickname: trimmed,
    passwordHash: legacyPasswordHash(password),
    authProvider: 'legacy-password',
    createdAt: now,
    updatedAt: now,
  });

  const user: AuthUser = { userId: openId, nickname: trimmed };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

/**
 * Login with nickname/password against the legacy users collection.
 */
export async function loginUser(nickname: string, password: string): Promise<AuthUser> {
  const trimmed = nickname.trim();
  if (!trimmed) throw new Error('请输入昵称');
  if (!password) throw new Error('请输入密码');

  const openId = await getOpenIdWithTimeout();
  if (!openId) {
    throw new Error('CloudBase 匿名身份获取失败，请检查安全域名和匿名登录配置');
  }

  const existing = await findUserByNickname(trimmed);
  if (!existing) throw new Error('用户不存在，请先注册');

  const storedHash = readString(existing.passwordHash);
  if (!passwordMatches(password, storedHash)) throw new Error('密码不正确');

  const user = recordToAuthUser(existing);
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
