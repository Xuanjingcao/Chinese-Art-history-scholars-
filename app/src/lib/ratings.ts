import { getDb, ensureAuth, isCloudBaseAvailable, isCloudBaseEnabled } from './cloudbase';
import { calculateNextRating, summarizeRatingRecords } from './ratingStats';

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

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getRatingOwnerId(record: Record<string, unknown>): string {
  return readString(record.userId) || readString(record._openid);
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
    const identity = await ensureAuth();
    const db = await getDb();
    const result = await db.collection('ratings')
      .where({ professorId: profId })
      .get();
    const rating = summarizeRatingRecords(result.data, identity.openid);
    setLocalUserRating(profId, rating.userRating);
    setLocalRatingStats(profId, rating.average, rating.count);
    return rating;
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
    const identity = await ensureAuth();
    const db = await getDb();
    const existing = await db.collection('ratings')
      .where({ professorId: profId })
      .get();
    const ownRecords = existing.data.filter((record) => (
      getRatingOwnerId(record) === identity.openid && readNumber(record.score) > 0
    ));
    const now = new Date().toISOString();

    if (ownRecords.length > 0) {
      const [primaryRecord, ...duplicateRecords] = ownRecords;
      const primaryId = readString(primaryRecord._id);

      if (readNumber(primaryRecord.score) === score) {
        await Promise.all(ownRecords.map((record) => (
          db.collection('ratings').doc(readString(record._id)).remove()
        )));
      } else {
        await db.collection('ratings').doc(primaryId).update({
          score,
          updatedAt: now,
        });
        await Promise.all(duplicateRecords.map((record) => (
          db.collection('ratings').doc(readString(record._id)).remove()
        )));
      }
    } else {
      await db.collection('ratings').add({
        professorId: profId,
        userId: identity.openid,
        score,
        createdAt: now,
        updatedAt: now,
      });
    }

    const refreshed = await db.collection('ratings')
      .where({ professorId: profId })
      .get();
    const next = summarizeRatingRecords(refreshed.data, identity.openid);
    setLocalUserRating(profId, next.userRating);
    setLocalRatingStats(profId, next.average, next.count);
    return next;
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
