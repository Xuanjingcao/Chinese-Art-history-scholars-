import academyData from '@/data/academies.json';
import {
  normalizeAcademyConfig,
  type AcademyConfig,
} from '@/lib/academyConfig';

export const staticAcademyConfig = normalizeAcademyConfig(academyData);

function shouldFetchLocalAcademyData() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

export async function loadAcademyConfig(): Promise<AcademyConfig> {
  if (!shouldFetchLocalAcademyData()) {
    return staticAcademyConfig;
  }

  try {
    const response = await fetch(`/api/admin/academies?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return staticAcademyConfig;
    return normalizeAcademyConfig(await response.json());
  } catch {
    return staticAcademyConfig;
  }
}
