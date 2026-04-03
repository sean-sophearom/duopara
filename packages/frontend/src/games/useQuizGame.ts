import { ref, computed } from 'vue';
import { shuffleArray } from '@duopara/shared';
import type { PracticeWord, PracticeAttempt } from './types';

export { shuffleArray } from '@duopara/shared';

export function pickRandom<T>(array: T[], count: number, exclude?: T[]): T[] {
  const filtered = exclude ? array.filter(item => !exclude.includes(item)) : array;
  const shuffled = shuffleArray(filtered);
  return shuffled.slice(0, count);
}

export function getDistractors(
  allWords: PracticeWord[],
  currentWord: PracticeWord,
  count: number,
  type: 'translation' | 'word',
): string[] {
  const others = allWords.filter(w => w.vocabularyWord.id !== currentWord.vocabularyWord.id);
  const shuffled = shuffleArray(others);

  const distractors: string[] = [];

  for (const word of shuffled) {
    if (distractors.length >= count) break;
    const value = type === 'translation' ? word.gameData?.translation : word.vocabularyWord.word;
    if (value && !distractors.includes(value)) {
      distractors.push(value);
    }
  }

  if (distractors.length < count && currentWord.gameData) {
    const gameDistractors =
      type === 'translation' ? currentWord.gameData.distractorTranslations : [];
    for (const d of gameDistractors) {
      if (distractors.length >= count) break;
      if (!distractors.includes(d)) {
        distractors.push(d);
      }
    }
  }

  return distractors.slice(0, count);
}

export function useQuizGame(props: {
  words: PracticeWord[];
  onAttempt: (attempt: PracticeAttempt) => void;
  onComplete: () => void;
}) {
  const currentIndex = ref(0);
  const correctCount = ref(0);
  const incorrectCount = ref(0);
  const selectedAnswer = ref<string | null>(null);
  const showFeedback = ref(false);
  const isCorrect = ref(false);

  const currentWord = computed(() => props.words[currentIndex.value]);

  function handleSelect(answer: string, correctAnswer: string, questionData: any) {
    if (selectedAnswer.value) return;

    const correct = answer === correctAnswer;
    selectedAnswer.value = answer;
    isCorrect.value = correct;
    showFeedback.value = true;

    if (correct) correctCount.value++;
    else incorrectCount.value++;

    props.onAttempt({
      vocabularyWordId: currentWord.value.vocabularyWord.id,
      isCorrect: correct,
      questionData,
      userAnswer: answer,
      correctAnswer,
    });
  }

  function handleContinue() {
    showFeedback.value = false;
    selectedAnswer.value = null;

    if (currentIndex.value < props.words.length - 1) {
      currentIndex.value++;
    } else {
      props.onComplete();
    }
  }

  function handleExit() {
    if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
      props.onComplete();
    }
  }

  return {
    currentIndex,
    currentWord,
    correctCount,
    incorrectCount,
    selectedAnswer,
    showFeedback,
    isCorrect,
    handleSelect,
    handleContinue,
    handleExit,
  };
}
