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

export type CloudBaseRecord = Record<string, unknown>;

export interface CloudBaseQuery {
  where(query: CloudBaseRecord): CloudBaseQuery;
  orderBy(field: string, direction: 'asc' | 'desc'): CloudBaseQuery;
  limit(count: number): CloudBaseQuery;
  get(): Promise<{ data: CloudBaseRecord[] }>;
  count(): Promise<{ total: number }>;
}

export interface CloudBaseCollection extends CloudBaseQuery {
  doc(id: string): {
    get(): Promise<{ data: CloudBaseRecord | null }>;
    update(data: CloudBaseRecord): Promise<unknown>;
    remove(): Promise<unknown>;
  };
  add(data: CloudBaseRecord): Promise<{ id?: string }>;
}

export interface CloudBaseDatabase {
  collection(name: string): CloudBaseCollection;
  command: {
    in<T>(values: T[]): unknown;
    inc(value: number): unknown;
  };
}

interface CloudBaseAuth {
  getLoginState(): Promise<{ user?: { uid?: string; openid?: string } } | null>;
  signInAnonymously(): Promise<{
    error?: { message?: string } | string;
    data?: CloudBaseRecord & { user?: { uid?: string; openid?: string } };
  }>;
}

interface CloudBaseApp {
  auth(): CloudBaseAuth;
  database(): CloudBaseDatabase;
}

interface CloudBaseSdk {
  init(config: { env: string }): CloudBaseApp;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

let _app: CloudBaseApp | null = null;
let _db: CloudBaseDatabase | null = null;
let _cloudbasePromise: Promise<CloudBaseSdk> | null = null;

async function loadCloudbaseSdk() {
  if (!_cloudbasePromise) {
    _cloudbasePromise = Promise.all([
      import('@cloudbase/js-sdk'),
      import('@cloudbase/js-sdk/auth'),
      import('@cloudbase/js-sdk/database'),
    ]).then(([cloudbaseModule]) => (cloudbaseModule.default || cloudbaseModule) as unknown as CloudBaseSdk);
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
    } catch (e) {
      console.warn('[CloudBase] init failed:', getErrorMessage(e));
    }
  }
  return _app;
}

export async function getDb() {
  await getApp();
  if (!_db) throw new Error('CloudBase database not initialized');
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
  let loginState: Awaited<ReturnType<CloudBaseAuth['getLoginState']>> = null;
  try { loginState = await auth.getLoginState(); } catch { /* ignore */ }
  const existingId = loginState?.user?.openid || loginState?.user?.uid;
  if (existingId) {
    return { uid: loginState?.user?.uid || existingId, openid: existingId };
  }

  // Sign in anonymously using v2 API
  const result = await auth.signInAnonymously();

  if (result.error) {
    const errorMessage = typeof result.error === 'string' ? result.error : result.error.message;
    throw new Error(`Anonymous auth failed: ${errorMessage || 'unknown error'}`);
  }

  // Extract a browser-compatible identity safely (avoid circular JSON).
  // Web auth commonly exposes uid, while some runtimes expose openid.
  let openid: string | undefined;
  let uid: string | undefined;
  if (result.data) {
    const d = result.data;
    if (d.user) { openid = d.user.openid; uid = d.user.uid; }
    if (!openid) { openid = String(d.openid || d._openid || ''); }
    if (!uid) { uid = String(d.uid || ''); }
  }

  const identity = openid || uid;
  if (!identity) {
    const d = result.data;
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
  } catch (e) {
    console.warn('[CloudBase] getOpenId failed:', getErrorMessage(e));
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
