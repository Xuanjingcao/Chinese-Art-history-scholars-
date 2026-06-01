import homepageData from '@/data/homepage.json';
import {
  normalizeHomepageConfig,
  type HomepageContentConfig,
} from '@/lib/homepageConfig';

export const staticHomepageConfig = normalizeHomepageConfig(homepageData);

function shouldFetchLocalHomepageData() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

export async function loadHomepageConfig(): Promise<HomepageContentConfig> {
  if (!shouldFetchLocalHomepageData()) {
    return staticHomepageConfig;
  }

  try {
    const response = await fetch(`/api/admin/homepage?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return staticHomepageConfig;
    return normalizeHomepageConfig(await response.json());
  } catch {
    return staticHomepageConfig;
  }
}
