import { getDb, ensureAuth, isCloudBaseAvailable, isCloudBaseEnabled } from './cloudbase';
import { calculateNextRating } from './ratingStats';

export interface RatingData {
  average: number;
  count: number;
  userRating: number;
}

const USER_RATING_KEY = 'user_ratings';
const LOCAL_RATING_STATS_KEY = 'local_rating_stats';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function getLocalUserRating(profId: string): number {
  try {
    const raw = localStorage.getItem(USER_RATING_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      return map[profId] || 0;
    }
  } catch { /* ignore */ }
  return 0;
}

function setLocalUserRating(profId: string, score: number): void {
  try {
    const raw = localStorage.getItem(USER_RATING_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (score > 0) {
      map[profId] = score;
    } else {
      delete map[profId];
    }
    localStorage.setItem(USER_RATING_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

function getLocalRatingStats(profId: string): { average: number; count: number } {
  try {
    const raw = localStorage.getItem(LOCAL_RATING_STATS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[profId] || { average: 0, count: 0 };
  } catch { /* ignore */ }
  return { average: 0, count: 0 };
}

function setLocalRatingStats(profId: string, average: number, count: number): void {
  try {
    const raw = localStorage.getItem(LOCAL_RATING_STATS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[profId] = { average, count };
    localStorage.setItem(LOCAL_RATING_STATS_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export async function getRating(profId: string): Promise<RatingData> {
  const userRating = getLocalUserRating(profId);
  if (!isCloudBaseEnabled() || !(await isCloudBaseAvailable())) {
    const stats = getLocalRatingStats(profId);
    return { ...stats, userRating };
  }

  try {
    await ensureAuth();
    const db = await getDb();
    const result = await db.collection('ratings')
      .where({ professorId: profId })
      .get();

    if (result.data.length > 0) {
      const data = result.data[0];
      return {
        average: readNumber(data.average),
        count: readNumber(data.count),
        userRating,
      };
    }
  } catch (e) {
    console.warn('[Rating] CloudBase read failed:', getErrorMessage(e));
  }

  return { average: 0, count: 0, userRating };
}

export async function submitRating(profId: string, score: number): Promise<RatingData> {
  const previousUserRating = getLocalUserRating(profId);

  if (!isCloudBaseEnabled() || !(await isCloudBaseAvailable())) {
    const stats = getLocalRatingStats(profId);
    const next = calculateNextRating(stats, previousUserRating, score);
    setLocalUserRating(profId, next.userRating);
    setLocalRatingStats(profId, next.average, next.count);
    return next;
  }

  try {
    await ensureAuth();
    const db = await getDb();

    // 查找是否已有记录
    const existing = await db.collection('ratings')
      .where({ professorId: profId })
      .get();

    if (existing.data.length > 0) {
      const doc = existing.data[0];
      const docAverage = readNumber(doc.average);
      const docCount = readNumber(doc.count);
      const next = calculateNextRating(
        { average: docAverage, count: docCount },
        previousUserRating,
        score,
      );

      await db.collection('ratings').doc(String(doc._id)).update({
        average: next.average,
        count: next.count,
      });

      setLocalUserRating(profId, next.userRating);
      return next;
    } else {
      const next = calculateNextRating({ average: 0, count: 0 }, previousUserRating, score);
      await db.collection('ratings').add({
        professorId: profId,
        average: next.average,
        count: next.count,
      });

      setLocalUserRating(profId, next.userRating);
      return next;
    }
  } catch (e) {
    console.warn('[Rating] CloudBase write failed:', getErrorMessage(e));
    const fallbackUserRating = previousUserRating === score ? 0 : score;
    setLocalUserRating(profId, fallbackUserRating);
    return {
      average: fallbackUserRating,
      count: fallbackUserRating > 0 ? 1 : 0,
      userRating: fallbackUserRating,
    };
  }
}
