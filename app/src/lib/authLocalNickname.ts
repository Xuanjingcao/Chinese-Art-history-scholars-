const LOCAL_NICKNAMES_KEY = 'scholar_registered_nicknames';

export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLocaleLowerCase();
}

function getReservedNicknames(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_NICKNAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function isLocalNicknameReserved(nickname: string): boolean {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return false;
  return getReservedNicknames().includes(normalized);
}

export function reserveLocalNickname(nickname: string): void {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return;

  const reserved = getReservedNicknames();
  if (reserved.includes(normalized)) return;

  localStorage.setItem(LOCAL_NICKNAMES_KEY, JSON.stringify([...reserved, normalized]));
}
