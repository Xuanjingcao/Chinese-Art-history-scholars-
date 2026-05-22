import { getDb, ensureAuth, isCloudBaseEnabled } from './cloudbase';

export interface RatingData {
  average: number;
  count: number;
  userRating: number;
}

const USER_RATING_KEY = 'user_ratings';
const LOCAL_RATING_STATS_KEY = 'local_rating_stats';

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
    map[profId] = score;
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
  if (!isCloudBaseEnabled()) {
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
        average: data.average || 0,
        count: data.count || 0,
        userRating,
      };
    }
  } catch (e: any) {
    console.warn('[Rating] CloudBase read failed:', e.message || e);
  }

  return { average: 0, count: 0, userRating };
}

export async function submitRating(profId: string, score: number): Promise<RatingData> {
  const previousUserRating = getLocalUserRating(profId);
  setLocalUserRating(profId, score);

  if (!isCloudBaseEnabled()) {
    const stats = getLocalRatingStats(profId);
    const oldTotal = stats.average * stats.count;
    const newCount = previousUserRating > 0 ? stats.count : stats.count + 1;
    const newTotal = previousUserRating > 0
      ? oldTotal - previousUserRating + score
      : oldTotal + score;
    const average = newCount > 0 ? Math.round((newTotal / newCount) * 10) / 10 : score;
    setLocalRatingStats(profId, average, newCount);
    return { average, count: newCount, userRating: score };
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
      const oldTotal = (doc.average || 0) * (doc.count || 0);
      const newCount = previousUserRating > 0 ? (doc.count || 0) : (doc.count || 0) + 1;
      const newTotal = previousUserRating > 0
        ? oldTotal - previousUserRating + score
        : oldTotal + score;
      const newAverage = newCount > 0
        ? Math.round((newTotal / newCount) * 10) / 10
        : score;

      await db.collection('ratings').doc(doc._id).update({
        average: newAverage,
        count: newCount,
      });

      return { average: newAverage, count: newCount, userRating: score };
    } else {
      await db.collection('ratings').add({
        professorId: profId,
        average: score,
        count: 1,
      });

      return { average: score, count: 1, userRating: score };
    }
  } catch (e: any) {
    console.warn('[Rating] CloudBase write failed:', e.message || e);
    return { average: score, count: 1, userRating: score };
  }
}
