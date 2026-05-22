/**
 * CloudBase Initialization — v2 API
 *
 * Environment variable (Vite):
 *   VITE_CLOUDBASE_ENV=your-env-id
 *
 * Local development disables CloudBase by default.
 * Set VITE_ENABLE_CLOUDBASE=true to force-enable it.
 */

// ─── Env Configuration ──────────────────────────────────────
const DEFAULT_ENV_ID = 'arthistory-d1gqlnmrc0c1ec226';
const ENV_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDBASE_ENV) || DEFAULT_ENV_ID;
const FORCE_ENABLE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_CLOUDBASE === 'true';
const FORCE_DISABLE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_DISABLE_CLOUDBASE === 'true';
const IS_LOCAL_HOST =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const CLOUDBASE_ENABLED = !FORCE_DISABLE && (FORCE_ENABLE || !IS_LOCAL_HOST);

// ─── App Instance ───────────────────────────────────────────

let _app: any = null;
let _db: any = null;
let _cloudbasePromise: Promise<any> | null = null;

async function loadCloudbaseSdk() {
  if (!_cloudbasePromise) {
    _cloudbasePromise = Promise.all([
      import('@cloudbase/js-sdk'),
      import('@cloudbase/js-sdk/auth'),
      import('@cloudbase/js-sdk/database'),
    ]).then(([cloudbaseModule]) => cloudbaseModule.default || cloudbaseModule);
  }
  return _cloudbasePromise;
}

async function getApp() {
  if (!CLOUDBASE_ENABLED) return null;
  if (!_app && ENV_ID) {
    try {
      const cloudbase = await loadCloudbaseSdk();
      _app = cloudbase.init({ env: ENV_ID });
      _db = _app.database();
    } catch (e: any) {
      console.warn('[CloudBase] init failed:', e.message);
    }
  }
  return _app;
}

export async function getDb() {
  await getApp();
  return _db;
}

// ─── Anonymous Auth (CloudBase v2 API) ─────────────────────

/**
 * Ensure anonymous auth is ready.
 * Uses CloudBase v2: auth.signInAnonymously()
 * Returns a stable user identity from the signed-in user.
 */
export async function ensureAuth(): Promise<{ uid: string; openid: string }> {
  if (!CLOUDBASE_ENABLED) throw new Error('CloudBase disabled in local development');

  const app = await getApp();
  if (!app) throw new Error('CloudBase not initialized (envId missing?)');

  const auth = app.auth();

  // Check if already signed in (safe access)
  let loginState: any = null;
  try { loginState = await auth.getLoginState(); } catch { /* ignore */ }
  const existingId = loginState?.user?.openid || loginState?.user?.uid;
  if (existingId) {
    return { uid: loginState.user.uid || existingId, openid: existingId };
  }

  // Sign in anonymously using v2 API
  const result = await auth.signInAnonymously();

  if (result.error) {
    throw new Error(`Anonymous auth failed: ${result.error.message || result.error}`);
  }

  // Extract a browser-compatible identity safely (avoid circular JSON).
  // Web auth commonly exposes uid, while some runtimes expose openid.
  let openid: string | undefined;
  let uid: string | undefined;
  if (result.data) {
    const d = result.data as any;
    if (d.user) { openid = d.user.openid; uid = d.user.uid; }
    if (!openid) { openid = d.openid || d._openid; }
    if (!uid) { uid = d.uid; }
  }

  const identity = openid || uid;
  if (!identity) {
    const d = result.data as any;
    throw new Error(
      `No CloudBase identity. dataKeys=[${d ? Object.keys(d).join(',') : 'null'}] ` +
      `userKeys=[${d?.user ? Object.keys(d.user).join(',') : 'null'}]`
    );
  }

  return { uid: uid || identity, openid: identity };
}

/**
 * Get current CloudBase user's openid.
 */
export async function getOpenId(): Promise<string | null> {
  try {
    if (!CLOUDBASE_ENABLED) return null;
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
  if (!CLOUDBASE_ENABLED) return false;
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

export function isCloudBaseEnabled(): boolean {
  return CLOUDBASE_ENABLED;
}
