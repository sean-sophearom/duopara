import { MAX_REVIEW_INTERVAL_DAYS } from './constants.js';

/**
 * SM-2 based spaced repetition algorithm.
 * Returns new review schedule based on answer correctness.
 */
export function calculateNextReview(
  currentDifficulty: number,
  streak: number,
  isCorrect: boolean
): { nextPracticeAt: Date; difficultyScore: number; streak: number } {
  let newDifficulty = currentDifficulty;
  let newStreak = streak;

  if (isCorrect) {
    newStreak += 1;
    newDifficulty = Math.min(5.0, currentDifficulty + 0.1);
  } else {
    newStreak = 0;
    newDifficulty = Math.max(1.3, currentDifficulty - 0.3);
  }

  let intervalDays: number;
  if (newStreak === 0) {
    intervalDays = 0;
  } else if (newStreak === 1) {
    intervalDays = 1;
  } else if (newStreak === 2) {
    intervalDays = 3;
  } else {
    const previousInterval = Math.pow(newDifficulty, newStreak - 2) * 3;
    intervalDays = Math.min(MAX_REVIEW_INTERVAL_DAYS, Math.round(previousInterval * newDifficulty));
  }

  const nextPracticeAt = new Date();
  nextPracticeAt.setDate(nextPracticeAt.getDate() + intervalDays);

  return { nextPracticeAt, difficultyScore: newDifficulty, streak: newStreak };
}
