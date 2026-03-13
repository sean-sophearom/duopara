import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../src/store/authStore";
import { practiceApi } from "../../src/lib/api";
import {
  GameType,
  VocabularyStatus,
  PracticeWord,
  SessionStats,
  GameConfig,
  VocabularyWord,
} from "../../src/types/games";
// import { shuffleArray } from "@duopara/shared";
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";

type ViewState = "loading" | "playing" | "results";

export default function PracticeSessionScreen() {
  const params = useLocalSearchParams<{
    gameType: string;
    statuses: string;
    wordCount: string;
    config: string;
  }>();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const gameType = params.gameType as GameType;
  const statuses: VocabularyStatus[] = JSON.parse(params.statuses || "[]");
  const wordCount = parseInt(params.wordCount || "5");
  const config: GameConfig = JSON.parse(params.config || "{}");

  const [viewState, setViewState] = useState<ViewState>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [practiceWords, setPracticeWords] = useState<PracticeWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [showFeedback, setShowFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const sourceLanguage = user?.settings?.targetLanguage || "Spanish";
  const targetLanguage = user?.settings?.nativeLanguage || "English";

  // Mutations
  const getWordsMutation = useMutation({
    mutationFn: practiceApi.getWords,
  });

  const getGameDataMutation = useMutation({
    mutationFn: practiceApi.getGameDataBatch,
  });

  const startSessionMutation = useMutation({
    mutationFn: practiceApi.startSession,
  });

  const submitAttemptMutation = useMutation({
    mutationFn: practiceApi.submitAttempt,
  });

  const completeSessionMutation = useMutation({
    mutationFn: practiceApi.completeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      queryClient.invalidateQueries({ queryKey: ["practice"] });
    },
  });

  // Initialize game
  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = async () => {
    try {
      // 1. Get words
      const wordsResponse = await getWordsMutation.mutateAsync({
        language: sourceLanguage,
        statuses,
        limit: wordCount,
        prioritizeSpacedRepetition: true,
      });

      const words: VocabularyWord[] = wordsResponse.data.words;

      if (words.length === 0) {
        alert("No words found matching your filters.");
        router.back();
        return;
      }

      // 2. Get game data
      const gameDataResponse = await getGameDataMutation.mutateAsync({
        words: words.map((w) => ({
          word: w.word,
          translation: w.translation || "",
        })),
        sourceLanguage,
        targetLanguage,
      });

      const results = gameDataResponse.data.results;

      // 3. Start session
      const sessionResponse = await startSessionMutation.mutateAsync({
        gameType,
        sourceLanguage,
        targetLanguage,
        wordIds: words.map((w) => w.id),
        config,
      });

      setSessionId(sessionResponse.data.session.id);

      // 4. Combine words with game data
      const practiceWordsData: PracticeWord[] = words.map((w) => ({
        vocabularyWord: w,
        gameData: results[w.word]?.data || null,
        loading: false,
        error: results[w.word]?.error,
      }));

      setPracticeWords(practiceWordsData);
      setStartTime(Date.now());
      setViewState("playing");
    } catch (error) {
      console.error("Failed to start game:", error);
      alert("Failed to start game. Please try again.");
      router.back();
    }
  };

  const handleAnswer = async (isCorrect: boolean, userAnswer: string, correctAnswer: string) => {
    if (showFeedback) return;

    const currentWord = practiceWords[currentIndex];
    if (!currentWord || !sessionId) return;

    setShowFeedback(isCorrect ? "correct" : "incorrect");

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    } else {
      setIncorrectCount((c) => c + 1);
    }

    // Submit attempt
    await submitAttemptMutation.mutateAsync({
      sessionId,
      vocabularyWordId: currentWord.vocabularyWord.id,
      isCorrect,
      responseTimeMs: Date.now() - startTime,
      questionData: { gameType },
      userAnswer,
      correctAnswer,
    });

    // Move to next or complete
    setTimeout(() => {
      setShowFeedback(null);

      if (currentIndex + 1 >= practiceWords.length) {
        completeGame();
      } else {
        setCurrentIndex((i) => i + 1);
        setStartTime(Date.now());
      }
    }, 1500);
  };

  const completeGame = async () => {
    if (!sessionId) return;

    await completeSessionMutation.mutateAsync(sessionId);

    const totalTimeMs = Date.now() - startTime;
    const total = correctCount + incorrectCount + 1; // +1 for current
    setSessionStats({
      accuracy: ((correctCount + (showFeedback === "correct" ? 1 : 0)) / total) * 100,
      totalTimeMs,
      avgTimeMs: totalTimeMs / total,
      correctCount: correctCount + (showFeedback === "correct" ? 1 : 0),
      incorrectCount: incorrectCount + (showFeedback === "incorrect" ? 1 : 0),
    });

    setViewState("results");
  };

  // Render loading
  if (viewState === "loading") {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Stack.Screen options={{ title: "Loading..." }} />
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="text-gray-600 mt-4">Preparing your practice...</Text>
      </SafeAreaView>
    );
  }

  // Render results
  if (viewState === "results" && sessionStats) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ title: "Results" }} />
        <View className="flex-1 items-center justify-center p-6">
          <Animated.View
            entering={FadeIn.duration(500)}
            className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-lg"
          >
            <View className="items-center mb-6">
              {sessionStats.accuracy >= 80 ? (
                <Ionicons name="trophy" size={64} color="#f59e0b" />
              ) : sessionStats.accuracy >= 50 ? (
                <Ionicons name="thumbs-up" size={64} color="#22c55e" />
              ) : (
                <Ionicons name="school" size={64} color="#6366f1" />
              )}
              <Text className="text-3xl font-bold text-gray-900 mt-4">
                {Math.round(sessionStats.accuracy)}%
              </Text>
              <Text className="text-gray-500">Accuracy</Text>
            </View>

            <View className="flex-row justify-around mb-8">
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center">
                  <Text className="text-xl font-bold text-green-600">
                    {sessionStats.correctCount}
                  </Text>
                </View>
                <Text className="text-sm text-gray-500 mt-1">Correct</Text>
              </View>
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center">
                  <Text className="text-xl font-bold text-red-600">
                    {sessionStats.incorrectCount}
                  </Text>
                </View>
                <Text className="text-sm text-gray-500 mt-1">Incorrect</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-primary-600 py-4 rounded-xl items-center"
            >
              <Text className="text-white font-semibold text-lg">
                Continue
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // Render game
  const currentWord = practiceWords[currentIndex];
  if (!currentWord || !currentWord.gameData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-600">Loading question...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: `${currentIndex + 1} / ${practiceWords.length}`,
        }}
      />

      {/* Progress bar */}
      <View className="h-2 bg-gray-200">
        <View
          className="h-full bg-primary-500"
          style={{
            width: `${((currentIndex + 1) / practiceWords.length) * 100}%`,
          }}
        />
      </View>

      {/* Feedback overlay */}
      {showFeedback && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className={`absolute inset-0 z-50 items-center justify-center ${
            showFeedback === "correct" ? "bg-green-500/20" : "bg-red-500/20"
          }`}
        >
          <View
            className={`w-24 h-24 rounded-full items-center justify-center ${
              showFeedback === "correct" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            <Ionicons
              name={showFeedback === "correct" ? "checkmark" : "close"}
              size={48}
              color="white"
            />
          </View>
        </Animated.View>
      )}

      {/* Game content */}
      <View className="flex-1 p-4">
        {gameType === "definition" && (
          <DefinitionGame
            word={currentWord}
            optionCount={config.optionCount || 4}
            onAnswer={handleAnswer}
          />
        )}
        {gameType === "translation" && (
          <TranslationGame
            word={currentWord}
            optionCount={config.optionCount || 4}
            onAnswer={handleAnswer}
          />
        )}
        {gameType === "reverse" && (
          <ReverseTranslationGame
            word={currentWord}
            practiceWords={practiceWords}
            optionCount={config.optionCount || 4}
            onAnswer={handleAnswer}
          />
        )}
        {gameType === "fillblank" && (
          <FillBlankGame
            word={currentWord}
            optionCount={config.optionCount || 4}
            onAnswer={handleAnswer}
          />
        )}
        {gameType === "truefalse" && (
          <TrueFalseGame
            word={currentWord}
            onAnswer={handleAnswer}
          />
        )}
        {gameType === "matching" && (
          <MatchingGame
            practiceWords={practiceWords}
            pairCount={config.pairCount || 4}
            onComplete={(correct, total) => {
              setCorrectCount(correct);
              setIncorrectCount(total - correct);
              completeGame();
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// Game Components
function DefinitionGame({
  word,
  optionCount,
  onAnswer,
}: {
  word: PracticeWord;
  optionCount: number;
  onAnswer: (correct: boolean, userAnswer: string, correctAnswer: string) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!word.gameData) return;
    const correct = word.gameData.definition;
    const distractors = word.gameData.distractorDefinitions.slice(
      0,
      optionCount - 1
    );
    setOptions(shuffleArray([correct, ...distractors]));
  }, [word, optionCount]);

  const correctAnswer = word.gameData?.definition || "";

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-gray-500 mb-2">What does this mean?</Text>
        <Text className="text-4xl font-bold text-gray-900">
          {word.vocabularyWord.word}
        </Text>
      </View>

      <View className="gap-3 pb-4">
        {options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onAnswer(option === correctAnswer, option, correctAnswer)}
            className="bg-white p-4 rounded-xl border border-gray-200 active:bg-gray-50"
          >
            <Text className="text-gray-800 text-center text-lg">{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TranslationGame({
  word,
  optionCount,
  onAnswer,
}: {
  word: PracticeWord;
  optionCount: number;
  onAnswer: (correct: boolean, userAnswer: string, correctAnswer: string) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!word.gameData) return;
    const correct = word.gameData.translation;
    const distractors = word.gameData.distractorTranslations.slice(
      0,
      optionCount - 1
    );
    setOptions(shuffleArray([correct, ...distractors]));
  }, [word, optionCount]);

  const correctAnswer = word.gameData?.translation || "";

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-gray-500 mb-2">Translate this word:</Text>
        <Text className="text-4xl font-bold text-gray-900">
          {word.vocabularyWord.word}
        </Text>
      </View>

      <View className="gap-3 pb-4">
        {options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onAnswer(option === correctAnswer, option, correctAnswer)}
            className="bg-white p-4 rounded-xl border border-gray-200 active:bg-gray-50"
          >
            <Text className="text-gray-800 text-center text-lg">{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ReverseTranslationGame({
  word,
  practiceWords,
  optionCount,
  onAnswer,
}: {
  word: PracticeWord;
  practiceWords: PracticeWord[];
  optionCount: number;
  onAnswer: (correct: boolean, userAnswer: string, correctAnswer: string) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    const correct = word.vocabularyWord.word;
    const otherWords = practiceWords
      .filter((w) => w.vocabularyWord.id !== word.vocabularyWord.id)
      .map((w) => w.vocabularyWord.word);
    const distractors = shuffleArray(otherWords).slice(0, optionCount - 1);
    setOptions(shuffleArray([correct, ...distractors]));
  }, [word, practiceWords, optionCount]);

  const correctAnswer = word.vocabularyWord.word;

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-gray-500 mb-2">
          Which word means:
        </Text>
        <Text className="text-3xl font-bold text-primary-600 text-center">
          {word.gameData?.translation}
        </Text>
      </View>

      <View className="gap-3 pb-4">
        {options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onAnswer(option === correctAnswer, option, correctAnswer)}
            className="bg-white p-4 rounded-xl border border-gray-200 active:bg-gray-50"
          >
            <Text className="text-gray-800 text-center text-lg">{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function FillBlankGame({
  word,
  optionCount,
  onAnswer,
}: {
  word: PracticeWord;
  optionCount: number;
  onAnswer: (correct: boolean, userAnswer: string, correctAnswer: string) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const sentence = word.gameData?.exampleSentences?.[0];

  useEffect(() => {
    if (!sentence) return;
    const correct = sentence.blankWord;
    const distractors = word.gameData?.distractorTranslations
      .slice(0, optionCount - 1)
      .map((t) => t.split(" ")[0]) || [];
    setOptions(shuffleArray([correct, ...distractors]));
  }, [word, optionCount, sentence]);

  if (!sentence) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">No example available</Text>
      </View>
    );
  }

  const correctAnswer = sentence.blankWord;

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-sm text-gray-500 mb-4">
          Fill in the blank:
        </Text>
        <Text className="text-xl text-gray-800 text-center leading-8">
          {sentence.sentence.replace("___", "_____")}
        </Text>
      </View>

      <View className="gap-3 pb-4">
        {options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onAnswer(option === correctAnswer, option, correctAnswer)}
            className="bg-white p-4 rounded-xl border border-gray-200 active:bg-gray-50"
          >
            <Text className="text-gray-800 text-center text-lg">{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TrueFalseGame({
  word,
  onAnswer,
}: {
  word: PracticeWord;
  onAnswer: (correct: boolean, userAnswer: string, correctAnswer: string) => void;
}) {
  const [showCorrect, setShowCorrect] = useState(() => Math.random() > 0.5);
  const displayTranslation = showCorrect
    ? word.gameData?.translation
    : word.gameData?.falseTranslation;

  const correctAnswer = showCorrect ? "true" : "false";

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-gray-500 mb-4">
          Is this translation correct?
        </Text>
        <Text className="text-3xl font-bold text-gray-900 mb-4">
          {word.vocabularyWord.word}
        </Text>
        <Text className="text-2xl text-primary-600">=</Text>
        <Text className="text-3xl font-bold text-primary-700 mt-4">
          {displayTranslation}
        </Text>
      </View>

      <View className="flex-row gap-4 pb-4">
        <TouchableOpacity
          onPress={() => onAnswer(!showCorrect, "false", correctAnswer)}
          className="flex-1 bg-red-100 p-6 rounded-xl items-center active:bg-red-200"
        >
          <Ionicons name="close" size={32} color="#dc2626" />
          <Text className="text-red-700 font-semibold mt-2">False</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAnswer(showCorrect, "true", correctAnswer)}
          className="flex-1 bg-green-100 p-6 rounded-xl items-center active:bg-green-200"
        >
          <Ionicons name="checkmark" size={32} color="#16a34a" />
          <Text className="text-green-700 font-semibold mt-2">True</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MatchingGame({
  practiceWords,
  pairCount,
  onComplete,
}: {
  practiceWords: PracticeWord[];
  pairCount: number;
  onComplete: (correct: number, total: number) => void;
}) {
  const words = practiceWords.slice(0, pairCount);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedTranslation, setSelectedTranslation] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{
    word: string;
    translation: string;
  } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const [shuffledWords] = useState(() =>
    shuffleArray(words.map((w) => w.vocabularyWord.word))
  );
  const [shuffledTranslations] = useState(() =>
    shuffleArray(words.map((w) => w.gameData?.translation || ""))
  );

  useEffect(() => {
    if (!selectedWord || !selectedTranslation) return;

    const wordData = words.find(
      (w) => w.vocabularyWord.word === selectedWord
    );
    const isCorrect = wordData?.gameData?.translation === selectedTranslation;

    if (isCorrect) {
      setMatchedPairs((prev) => new Set([...prev, selectedWord]));
      setCorrectCount((c) => c + 1);
    } else {
      setWrongPair({ word: selectedWord, translation: selectedTranslation });
      setTimeout(() => setWrongPair(null), 500);
    }

    setSelectedWord(null);
    setSelectedTranslation(null);

    // Check if complete
    if (matchedPairs.size + 1 === words.length) {
      setTimeout(() => {
        onComplete(correctCount + (isCorrect ? 1 : 0), words.length);
      }, 500);
    }
  }, [selectedWord, selectedTranslation]);

  return (
    <View className="flex-1">
      <Text className="text-center text-gray-500 mb-4">
        Match the words with their translations
      </Text>

      <View className="flex-row flex-1">
        {/* Words column */}
        <View className="flex-1 gap-2 pr-2">
          {shuffledWords.map((word) => {
            const isMatched = matchedPairs.has(word);
            const isSelected = selectedWord === word;
            const isWrong = wrongPair?.word === word;

            return (
              <TouchableOpacity
                key={word}
                onPress={() => !isMatched && setSelectedWord(word)}
                disabled={isMatched}
                className={`p-4 rounded-xl border ${
                  isMatched
                    ? "bg-green-50 border-green-300"
                    : isWrong
                    ? "bg-red-50 border-red-300"
                    : isSelected
                    ? "bg-primary-50 border-primary-500"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    isMatched
                      ? "text-green-700"
                      : isWrong
                      ? "text-red-700"
                      : "text-gray-800"
                  }`}
                >
                  {word}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Translations column */}
        <View className="flex-1 gap-2 pl-2">
          {shuffledTranslations.map((translation) => {
            const matchedWord = words.find(
              (w) => w.gameData?.translation === translation
            )?.vocabularyWord.word;
            const isMatched = Boolean(matchedWord && matchedPairs.has(matchedWord));
            const isSelected = selectedTranslation === translation;
            const isWrong = wrongPair?.translation === translation;

            return (
              <TouchableOpacity
                key={translation}
                onPress={() => !isMatched && setSelectedTranslation(translation)}
                disabled={isMatched}
                className={`p-4 rounded-xl border ${
                  isMatched
                    ? "bg-green-50 border-green-300"
                    : isWrong
                    ? "bg-red-50 border-red-300"
                    : isSelected
                    ? "bg-primary-50 border-primary-500"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    isMatched
                      ? "text-green-700"
                      : isWrong
                      ? "text-red-700"
                      : "text-gray-800"
                  }`}
                >
                  {translation}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text className="text-center text-gray-500 mt-4">
        {matchedPairs.size} / {words.length} matched
      </Text>
    </View>
  );
}
