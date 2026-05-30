import type { RatingData } from './ratings';

function roundRating(value: number) {
  return Math.round(value * 10) / 10;
}

interface RatingRecord {
  userId?: unknown;
  _openid?: unknown;
  score?: unknown;
  average?: unknown;
  count?: unknown;
}

function readPositiveNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function readOwnerId(record: RatingRecord): string {
  if (typeof record.userId === 'string' && record.userId) return record.userId;
  return typeof record._openid === 'string' ? record._openid : '';
}

export function summarizeRatingRecords(records: RatingRecord[], currentUserId: string): RatingData {
  let total = 0;
  let count = 0;
  let userRating = 0;
  const ratingsByOwner = new Map<string, number>();
  const ratingsWithoutOwner: number[] = [];

  records.forEach((record) => {
    const score = readPositiveNumber(record.score);
    if (score > 0) {
      const ownerId = readOwnerId(record);
      if (ownerId) {
        ratingsByOwner.set(ownerId, score);
      } else {
        ratingsWithoutOwner.push(score);
      }
      return;
    }

    // Preserve existing aggregate documents while individual records roll out.
    const legacyAverage = readPositiveNumber(record.average);
    const legacyCount = readPositiveNumber(record.count);
    if (legacyAverage > 0 && legacyCount > 0) {
      total += legacyAverage * legacyCount;
      count += legacyCount;
    }
  });

  ratingsByOwner.forEach((score, ownerId) => {
    total += score;
    count += 1;
    if (ownerId === currentUserId) userRating = score;
  });

  ratingsWithoutOwner.forEach((score) => {
    total += score;
    count += 1;
  });

  return {
    average: count > 0 ? roundRating(total / count) : 0,
    count,
    userRating,
  };
}

export function getStarDisplayScore(rating: RatingData): number {
  return rating.userRating;
}

export function calculateNextRating(
  current: Pick<RatingData, 'average' | 'count'>,
  previousUserRating: number,
  nextScore: number,
): RatingData {
  const oldTotal = current.average * current.count;

  if (previousUserRating > 0 && previousUserRating === nextScore) {
    const nextCount = Math.max(0, current.count - 1);
    const nextTotal = Math.max(0, oldTotal - previousUserRating);
    return {
      average: nextCount > 0 ? roundRating(nextTotal / nextCount) : 0,
      count: nextCount,
      userRating: 0,
    };
  }

  const nextCount = previousUserRating > 0 ? current.count : current.count + 1;
  const nextTotal = previousUserRating > 0
    ? oldTotal - previousUserRating + nextScore
    : oldTotal + nextScore;

  return {
    average: nextCount > 0 ? roundRating(nextTotal / nextCount) : nextScore,
    count: nextCount,
    userRating: nextScore,
  };
}
