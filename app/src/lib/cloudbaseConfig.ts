const DEFAULT_ENV_ID = 'arthistory-d1gqlnmrc0c1ec226';

export interface CloudBaseRuntimeInput {
  env?: Record<string, string | boolean | undefined>;
  hostname?: string;
}

export interface CloudBaseConfig {
  envId: string;
  enabled: boolean;
  isLocalHost: boolean;
  forceEnable: boolean;
  forceDisable: boolean;
}

function isTrue(value: string | boolean | undefined): boolean {
  return value === true || value === 'true';
}

export function getCloudBaseConfig(input: CloudBaseRuntimeInput = {}): CloudBaseConfig {
  const env = input.env ?? {};
  const hostname = input.hostname ?? '';
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const forceEnable = isTrue(env.VITE_ENABLE_CLOUDBASE);
  const forceDisable = isTrue(env.VITE_DISABLE_CLOUDBASE);

  return {
    envId: String(env.VITE_CLOUDBASE_ENV || DEFAULT_ENV_ID),
    enabled: !forceDisable && (forceEnable || !isLocalHost),
    isLocalHost,
    forceEnable,
    forceDisable,
  };
}

export function getCloudBaseModeLabel(input: CloudBaseRuntimeInput = {}): '云端后台' | '本地模式' {
  return getCloudBaseConfig(input).enabled ? '云端后台' : '本地模式';
}

export function getBrowserCloudBaseConfig(): CloudBaseConfig {
  return getCloudBaseConfig({
    env: typeof import.meta !== 'undefined' ? import.meta.env : {},
    hostname: typeof window !== 'undefined' ? window.location.hostname : '',
  });
}
