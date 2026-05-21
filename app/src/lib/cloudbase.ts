/**
 * CloudBase Initialization — v2 API
 *
 * Environment variable (Vite):
 *   VITE_CLOUDBASE_ENV=your-env-id
 *
 * Fallback: hardcoded default envId for production deployment.
 */

import cloudbase from '@cloudbase/js-sdk';
import '@cloudbase/js-sdk/auth';
import '@cloudbase/js-sdk/database';

// ─── Env Configuration ──────────────────────────────────────
const DEFAULT_ENV_ID = 'arthistory-d1gqlnmrc0c1ec226';
const ENV_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDBASE_ENV) || DEFAULT_ENV_ID;

// ─── App Instance ───────────────────────────────────────────

let _app: any = null;
let _db: any = null;

function getApp() {
  if (!_app && ENV_ID) {
    try {
      _app = cloudbase.init({ env: ENV_ID });
      _db = _app.database();
    } catch (e: any) {
      console.warn('[CloudBase] init failed:', e.message);
    }
  }
  return _app;
}

export function getDb() {
  getApp();
  return _db;
}

// Safe db export for backward compat
export const db = getDb() || ({} as any);

// ─── Anonymous Auth (CloudBase v2 API) ─────────────────────

/**
 * Ensure anonymous auth is ready.
 * Uses CloudBase v2: auth.signInAnonymously()
 * Returns { uid, openid } from the signed-in user.
 */
export async function ensureAuth(): Promise<{ uid: string; openid: string }> {
  const app = getApp();
  if (!app) throw new Error('CloudBase not initialized (envId missing?)');

  const auth = app.auth();

  // Check if already signed in (safe access)
  let loginState: any = null;
  try { loginState = await auth.getLoginState(); } catch { /* ignore */ }
  if (loginState?.user?.openid) {
    return { uid: loginState.user.uid || loginState.user.openid, openid: loginState.user.openid };
  }

  // Sign in anonymously using v2 API
  const result = await auth.signInAnonymously();

  if (result.error) {
    throw new Error(`Anonymous auth failed: ${result.error.message || result.error}`);
  }

  // Extract openid safely (avoid circular JSON)
  let openid: string | undefined;
  let uid: string | undefined;
  if (result.data) {
    const d = result.data as any;
    if (d.user) { openid = d.user.openid; uid = d.user.uid; }
    if (!openid) { openid = d.openid || d._openid; uid = d.uid; }
  }

  if (!openid) {
    const d = result.data as any;
    throw new Error(
      `No openid. dataKeys=[${d ? Object.keys(d).join(',') : 'null'}] ` +
      `userKeys=[${d?.user ? Object.keys(d.user).join(',') : 'null'}]`
    );
  }

  return { uid: uid || openid, openid };
}

/**
 * Get current CloudBase user's openid.
 */
export async function getOpenId(): Promise<string | null> {
  try {
    const cred = await ensureAuth();
    return cred.openid;
  } catch (e: any) {
    console.warn('[CloudBase] getOpenId failed:', e.message);
    return null;
  }
}

// ─── Health Check ───────────────────────────────────────────

let _cachedAvailable: boolean | null = null;

export async function isCloudBaseAvailable(): Promise<boolean> {
  if (_cachedAvailable !== null) return _cachedAvailable;
  try {
    await ensureAuth();
    _cachedAvailable = true;
    return true;
  } catch {
    _cachedAvailable = false;
    return false;
  }
}

export function resetCloudBaseCache(): void {
  _cachedAvailable = null;
}
