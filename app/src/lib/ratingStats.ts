import type { RatingData } from './ratings';

function roundRating(value: number) {
  return Math.round(value * 10) / 10;
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
