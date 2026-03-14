import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
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
      <SafeAreaView className="flex-1 bg-owl-50 items-center justify-center">
        <Stack.Screen options={{ title: "Loading...", headerShown: false }} />
        <View className="items-center">
          <View className="w-20 h-20 rounded-full bg-primary-200 items-center justify-center mb-6">
            <ActivityIndicator size="large" color="#58cc02" />
          </View>
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-xl">Preparing Practice</Text>
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 mt-2">Loading your vocabulary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render results
  if (viewState === "results" && sessionStats) {
    const isGreat = sessionStats.accuracy >= 80;
    const isGood = sessionStats.accuracy >= 50;
    
    return (
      <SafeAreaView className="flex-1 bg-owl-50">
        <Stack.Screen options={{ title: "Results", headerShown: false }} />
        <View className="flex-1 items-center justify-center p-6">
          <View className="bg-owl-100 rounded-2xl p-8 w-full max-w-sm">
            {/* Trophy/Icon */}
            <View className="items-center mb-6">
              <View className={`w-24 h-24 rounded-full items-center justify-center ${isGreat ? "bg-warning-200" : isGood ? "bg-primary-200" : "bg-secondary-200"}`}>
                {isGreat ? (
                  <Ionicons name="trophy" size={48} color="#ffc800" />
                ) : isGood ? (
                  <Ionicons name="thumbs-up" size={48} color="#58cc02" />
                ) : (
                  <Ionicons name="school" size={48} color="#1cb0f6" />
                )}
              </View>
              
              <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-5xl text-owl-900 mt-6">
                {Math.round(sessionStats.accuracy)}%
              </Text>
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-lg">Accuracy</Text>
              
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-center text-owl-600 mt-2 px-4">
                {isGreat ? "Amazing work! You're a star!" : isGood ? "Great progress! Keep it up!" : "Keep practicing, you'll get there!"}
              </Text>
            </View>

            {/* Stats row */}
            <View className="flex-row justify-around mb-8">
              <View className="items-center">
                <View className="w-16 h-16 rounded-2xl bg-primary-500 items-center justify-center">
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-white">
                    {sessionStats.correctCount}
                  </Text>
                </View>
                <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-owl-600 mt-2">Correct</Text>
              </View>
              <View className="items-center">
                <View className="w-16 h-16 rounded-2xl bg-danger-500 items-center justify-center">
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-white">
                    {sessionStats.incorrectCount}
                  </Text>
                </View>
                <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-owl-600 mt-2">Incorrect</Text>
              </View>
            </View>

            {/* Continue button */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              className="bg-primary-500 rounded-2xl py-5"
            >
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-center text-lg">Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render game
  const currentWord = practiceWords[currentIndex];
  if (!currentWord || !currentWord.gameData) {
    return (
      <SafeAreaView className="flex-1 bg-owl-50 items-center justify-center">
        <View className="w-16 h-16 rounded-full bg-owl-100 items-center justify-center">
          <ActivityIndicator size="small" color="#58cc02" />
        </View>
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 mt-4">Loading question...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-owl-50">
      <Stack.Screen
        options={{
          title: `${currentIndex + 1} / ${practiceWords.length}`,
          headerStyle: { backgroundColor: '#0f0f0f' },
          headerTitleStyle: { fontWeight: 'bold', color: '#e8e8e8' },
        }}
      />

      {/* Progress bar */}
      <View className="h-3 bg-owl-200 mx-4 mt-2 rounded-full overflow-hidden">
        <View
          className="h-full bg-primary-500 rounded-full"
          style={{ width: `${((currentIndex + 1) / practiceWords.length) * 100}%` }}
        />
      </View>

      {/* Feedback overlay */}
      {showFeedback && (
        <View
          className={`absolute inset-0 z-50 items-center justify-center ${
            showFeedback === "correct" ? "bg-primary-500/20" : "bg-danger-500/20"
          }`}
        >
          <View className={`w-28 h-28 rounded-full items-center justify-center ${
            showFeedback === "correct" ? "bg-primary-500" : "bg-danger-500"
          }`}>
            <Ionicons
              name={showFeedback === "correct" ? "checkmark" : "close"}
              size={56}
              color="white"
            />
          </View>
        </View>
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
    </View>
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
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm mb-4">What does this mean?</Text>
        <View className="bg-secondary-500 px-8 py-4 rounded-2xl">
          <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-3xl text-white">
            {word.vocabularyWord.word}
          </Text>
        </View>
      </View>

      <View className="gap-3 pb-4">
        {options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onAnswer(option === correctAnswer, option, correctAnswer)}
            activeOpacity={0.7}
            className="bg-owl-100 p-5 rounded-2xl"
          >
            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-800 text-center text-lg">{option}</Text>
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
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm mb-4">Translate this word:</Text>
        <View className="bg-primary-500 px-8 py-4 rounded-2xl">
          <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-3xl text-white">
            {word.vocabularyWord.word}
          </Text>
        </View>
      </View>

      <View className="gap-3 pb-4">
        {options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onAnswer(option === correctAnswer, option, correctAnswer)}
            activeOpacity={0.7}
            className="bg-owl-100 p-5 rounded-2xl"
          >
            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-800 text-center text-lg">{option}</Text>
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
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm mb-4">Which word means:</Text>
        <View className="bg-warning-500 px-8 py-4 rounded-2xl">
          <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-3xl text-white text-center">
            {word.gameData?.translation}
          </Text>
        </View>
      </View>

      <View className="gap-3 pb-4">
        {options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onAnswer(option === correctAnswer, option, correctAnswer)}
            activeOpacity={0.7}
            className="bg-owl-100 p-5 rounded-2xl"
          >
            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-800 text-center text-lg">{option}</Text>
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
        <Text className="text-owl-500">No example available</Text>
      </View>
    );
  }

  const correctAnswer = sentence.blankWord;

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center px-4">
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm mb-6">Fill in the blank:</Text>
        <View className="bg-owl-100 rounded-2xl p-6 w-full">
          <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-xl text-owl-800 text-center leading-8">
            {sentence.sentence.replace("___", "______")}
          </Text>
        </View>
      </View>

      <View className="gap-3 pb-4">
        {options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onAnswer(option === correctAnswer, option, correctAnswer)}
            activeOpacity={0.8}
            className="bg-owl-100 p-5 rounded-2xl"
          >
            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-800 text-center text-lg">{option}</Text>
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
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm mb-6">Is this translation correct?</Text>
        
        <View className="bg-owl-100 rounded-2xl p-8 items-center w-full">
          <View className="bg-secondary-500 px-6 py-3 rounded-2xl mb-4">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-white">
              {word.vocabularyWord.word}
            </Text>
          </View>
          
          <View className="my-2 w-12 h-12 rounded-full bg-owl-200 items-center justify-center">
            <Text className="text-2xl text-owl-400">=</Text>
          </View>
          
          <View className="bg-primary-500 px-6 py-3 rounded-2xl mt-4">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-white">
              {displayTranslation}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-4 pb-4">
        <TouchableOpacity
          onPress={() => onAnswer(!showCorrect, "false", correctAnswer)}
          activeOpacity={0.7}
          className="flex-1 bg-danger-500 p-6 items-center rounded-2xl"
        >
          <Ionicons name="close" size={36} color="#ffffff" />
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white mt-2 text-lg">False</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAnswer(showCorrect, "true", correctAnswer)}
          activeOpacity={0.7}
          className="flex-1 bg-primary-500 p-6 items-center rounded-2xl"
        >
          <Ionicons name="checkmark" size={36} color="#ffffff" />
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white mt-2 text-lg">True</Text>
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
      <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-center text-owl-600 mb-6">
        Match the words with their translations
      </Text>

      <View className="flex-row flex-1">
        {/* Words column */}
        <View className="flex-1 gap-3 pr-2">
          {shuffledWords.map((word) => {
            const isMatched = matchedPairs.has(word);
            const isSelected = selectedWord === word;
            const isWrong = wrongPair?.word === word;

            if (isMatched) {
              return (
                <View
                  key={word}
                  className="p-4 rounded-2xl bg-primary-200 border-2 border-primary-400"
                >
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-center text-primary-600">
                    {word}
                  </Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={word}
                onPress={() => setSelectedWord(isSelected ? null : word)}
                activeOpacity={0.8}
                className={`p-4 rounded-2xl border-2 ${
                  isWrong
                    ? "bg-danger-200 border-danger-400"
                    : isSelected
                    ? "bg-secondary-500 border-secondary-500"
                    : "bg-owl-100 border-owl-300"
                }`}
              >
                <Text
                  style={{ fontFamily: "Nunito_600SemiBold" }}
                  className={`text-center ${
                    isWrong ? "text-danger-600" : isSelected ? "text-white" : "text-owl-800"
                  }`}
                >
                  {word}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Translations column */}
        <View className="flex-1 gap-3 pl-2">
          {shuffledTranslations.map((translation) => {
            const matchedWord = words.find(
              (w) => w.gameData?.translation === translation
            )?.vocabularyWord.word;
            const isMatched = Boolean(matchedWord && matchedPairs.has(matchedWord));
            const isSelected = selectedTranslation === translation;
            const isWrong = wrongPair?.translation === translation;

            if (isMatched) {
              return (
                <View
                  key={translation}
                  className="p-4 rounded-2xl bg-primary-200 border-2 border-primary-400"
                >
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-center text-primary-600">
                    {translation}
                  </Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={translation}
                onPress={() => setSelectedTranslation(isSelected ? null : translation)}
                activeOpacity={0.8}
                className={`p-4 rounded-2xl border-2 ${
                  isWrong
                    ? "bg-danger-200 border-danger-400"
                    : isSelected
                    ? "bg-primary-500 border-primary-500"
                    : "bg-owl-100 border-owl-300"
                }`}
              >
                <Text
                  style={{ fontFamily: "Nunito_600SemiBold" }}
                  className={`text-center ${
                    isWrong ? "text-danger-600" : isSelected ? "text-white" : "text-owl-800"
                  }`}
                >
                  {translation}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Progress footer */}
      <View className="mt-4 items-center">
        <View className="bg-owl-200 px-6 py-3 rounded-full">
          <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-center text-owl-600">
            {matchedPairs.size} / {words.length} matched
          </Text>
        </View>
      </View>
    </View>
  );
}
