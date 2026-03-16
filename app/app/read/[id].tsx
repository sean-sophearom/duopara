import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { textsApi, translateApi, vocabularyApi, generateApi } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { GradientButton } from "../../src/components/ui";
import { useThemeColors } from "../../src/lib/theme";
import BottomSheet, { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

// Utility
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?""»'។])\s+/).filter((s) => s.trim().length > 0);
}

function cleanWord(word: string): string {
  return word.replace(/[^\p{L}''-]/gu, "").toLowerCase();
}

const LANGUAGE_CODES: Record<string, string> = {
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Italian: "it-IT",
  Portuguese: "pt-BR",
  Japanese: "ja-JP",
  Korean: "ko-KR",
  Chinese: "zh-CN",
};

// Types
interface WordInfo {
  word: string;
  translation: string;
  alternativeTranslations?: string[];
  partOfSpeech?: string;
  baseForm?: string;
  conjugation?: { tense?: string; person?: string; mood?: string };
  contextualNote?: string;
  gender?: string;
}

interface SentenceInfo {
  sentence: string;
  translation: string;
  grammarNotes?: { element: string; explanation: string }[];
  literalTranslation?: string;
}

interface ParallelTranslation {
  translation: string;
  literalTranslation?: string;
}

export default function ReadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();

  // State
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [sentenceInfo, setSentenceInfo] = useState<SentenceInfo | null>(null);
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);
  const [markedWords, setMarkedWords] = useState<Set<string>>(new Set());
  const [markedLearningWords, setMarkedLearningWords] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wordModalRef = useRef<BottomSheetModal>(null);
  const sentenceModalRef = useRef<BottomSheetModal>(null);
  const wordSnapPoints = useMemo(() => ["50%", "75%"], []);
  const sentenceSnapPoints = useMemo(() => ["50%", "75%"], []);

  // Parallel translation state
  const [showParallelView, setShowParallelView] = useState(false);
  const [parallelTranslations, setParallelTranslations] = useState<Array<ParallelTranslation | null>>([]);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [useLiteralTranslation, setUseLiteralTranslation] = useState(false);

  // Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [speechRate, setSpeechRate] = useState(0.9);
  const speakingRef = useRef(false);

  // Preferences
  const [highlightLearned, setHighlightLearned] = useState(true);
  const [highlightLearning, setHighlightLearning] = useState(true);
  const [highlightNew, setHighlightNew] = useState(true);

  // Refs
  const wordsLookedUpRef = useRef<Set<string>>(new Set());
  const sessionUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nativeLanguage = user?.settings?.nativeLanguage || "English";

  // Load preferences
  useEffect(() => {
    (async () => {
      const rate = await AsyncStorage.getItem("duopara.speechRate");
      if (rate) setSpeechRate(parseFloat(rate));

      const literal = await AsyncStorage.getItem("duopara.useLiteralTranslation");
      if (literal) setUseLiteralTranslation(literal === "true");

      const hl = await AsyncStorage.getItem("duopara.highlightLearned");
      if (hl !== null) setHighlightLearned(hl !== "false");

      const hlr = await AsyncStorage.getItem("duopara.highlightLearning");
      if (hlr !== null) setHighlightLearning(hlr !== "false");

      const hn = await AsyncStorage.getItem("duopara.highlightNew");
      if (hn !== null) setHighlightNew(hn !== "false");
    })();
  }, []);

  // Save speech rate
  const updateSpeechRate = async (rate: number) => {
    const clamped = Math.round(rate * 100) / 100;
    setSpeechRate(clamped);
    await AsyncStorage.setItem("duopara.speechRate", String(clamped));
  };

  // Fetch text
  const { data, isLoading: isLoadingText, error } = useQuery({
    queryKey: ["text", id],
    queryFn: () => textsApi.getOne(id!).then((r) => r.data),
    enabled: !!id,
  });

  const text = data?.text;
  const knownWordsSet = new Set((text?.knownWordsUsed || []).map((w: string) => w.toLowerCase()));
  const newWordsSet = new Set((text?.newWordsIntroduced || []).map((w: string) => w.toLowerCase()));

  // Fetch learning vocabulary
  const { data: learningVocabData } = useQuery({
    queryKey: ["vocabulary", "learning", text?.language],
    queryFn: () =>
      vocabularyApi
        .getAll({ language: text?.language, status: "learning", limit: 1000 })
        .then((r) => r.data),
    enabled: !!text?.language,
  });

  useEffect(() => {
    if (learningVocabData?.words) {
      setMarkedLearningWords(
        new Set(learningVocabData.words.map((w: { word: string }) => w.word.toLowerCase()))
      );
    }
  }, [learningVocabData]);

  // Session management
  useEffect(() => {
    if (!text || !id) return;

    const existingSessions = text.readingSessions || [];
    const recentSession = existingSessions[0];

    if (recentSession && !recentSession.completedAt) {
      setSessionId(recentSession.id);
      const learnedInSession = recentSession.wordsMarkedLearned || [];
      setMarkedWords(new Set(learnedInSession.map((w: string) => w.toLowerCase())));
      wordsLookedUpRef.current = new Set(recentSession.wordsLookedUp || []);
    } else {
      textsApi
        .startSession(id)
        .then((response) => {
          setSessionId(response.data.session.id);
          setMarkedWords(new Set());
          wordsLookedUpRef.current = new Set();
        })
        .catch(console.error);
    }
  }, [text, id]);

  // Stop TTS and clear timers on unmount
  useEffect(() => {
    return () => {
      speakingRef.current = false;
      Speech.stop();
      if (sessionUpdateTimeoutRef.current) {
        clearTimeout(sessionUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Warm up TTS engine as soon as the language is known
  useEffect(() => {
    if (!text?.language) return;
    Speech.getAvailableVoicesAsync().catch(() => {});
  }, [text?.language]);

  const updateSession = useCallback(
    (updates: { wordsLookedUp?: string[]; wordsMarkedLearned?: string[] }) => {
      if (!sessionId) return;

      if (sessionUpdateTimeoutRef.current) {
        clearTimeout(sessionUpdateTimeoutRef.current);
      }

      sessionUpdateTimeoutRef.current = setTimeout(() => {
        textsApi.updateSession(sessionId, updates).catch(console.error);
      }, 500);
    },
    [sessionId]
  );

  // Mutations
  const markLearnedMutation = useMutation({
    mutationFn: (word: string) => vocabularyApi.markLearned(word, text?.language || ""),
    onSuccess: (_, word) => {
      const normalized = word.toLowerCase();
      setMarkedWords((prev) => new Set(prev).add(normalized));
      setMarkedLearningWords((prev) => {
        const next = new Set(prev);
        next.delete(normalized);
        return next;
      });
      updateSession({ wordsMarkedLearned: [normalized] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  const markLearningMutation = useMutation({
    mutationFn: (word: string) => vocabularyApi.markLearning(word, text?.language || ""),
    onSuccess: (_, word) => {
      setMarkedLearningWords((prev) => new Set(prev).add(word.toLowerCase()));
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  const simplifyMutation = useMutation({
    mutationFn: () => generateApi.regenerate(id!, "simplify"),
    onSuccess: (response) => router.replace(`/read/${response.data.text.id}`),
  });

  const harderMutation = useMutation({
    mutationFn: () => generateApi.regenerate(id!, "harder"),
    onSuccess: (response) => router.replace(`/read/${response.data.text.id}`),
  });

  // Speech
  const speak = useCallback(
    async (textToSpeak: string) => {
      await Speech.stop();
      await Speech.speak(textToSpeak, {
        language: LANGUAGE_CODES[text?.language || "Spanish"] || "es-ES",
        rate: speechRate,
      });
    },
    [text?.language, speechRate]
  );

  const speakAll = useCallback(async () => {
    if (!text?.content) return;
    await Speech.stop();

    const sentences = splitSentences(text.content);
    const lang = LANGUAGE_CODES[text.language] || "es-ES";

    setIsSpeaking(true);
    speakingRef.current = true;

    for (let i = 0; i < sentences.length; i++) {
      if (!speakingRef.current) break;

      setSpeakingIdx(i);
      await new Promise<void>((resolve) => {
        Speech.speak(sentences[i], {
          language: lang,
          rate: speechRate,
          onDone: resolve,
          onError: () => resolve(),
          onStopped: resolve,
        });
      });
    }

    setIsSpeaking(false);
    setSpeakingIdx(null);
    speakingRef.current = false;
  }, [text?.content, text?.language, speechRate]);

  const stopSpeaking = useCallback(async () => {
    speakingRef.current = false;
    await Speech.stop();
    setIsSpeaking(false);
    setSpeakingIdx(null);
  }, []);

  // Translation handlers
  const handleWordPress = async (word: string, sentence: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const clean = cleanWord(word);
    if (!clean || clean.length < 2) return;

    setSelectedWord(clean);
    setSelectedSentence(sentence);
    wordModalRef.current?.present();
    setIsLoadingWord(true);
    setWordInfo(null);

    if (!wordsLookedUpRef.current.has(clean)) {
      wordsLookedUpRef.current.add(clean);
      updateSession({ wordsLookedUp: [clean] });
    }

    try {
      const response = await translateApi.full({
        word: clean,
        sourceLanguage: text?.language || "Spanish",
        targetLanguage: nativeLanguage,
        context: sentence,
      });
      setWordInfo({ word: clean, ...response.data });
    } catch (error) {
      console.error("Translation error:", error);
      setWordInfo({ word: clean, translation: "Translation failed" });
    } finally {
      setIsLoadingWord(false);
    }
  };

  const handleSentencePress = async (sentence: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSentence(sentence);
    sentenceModalRef.current?.present();
    setIsLoadingSentence(true);
    setSentenceInfo(null);

    try {
      const response = await translateApi.sentence({
        sentence,
        sourceLanguage: text?.language || "Spanish",
        targetLanguage: nativeLanguage,
        includeGrammarHints: true,
      });
      setSentenceInfo({ sentence, ...response.data });
    } catch (error) {
      console.error("Translation error:", error);
      setSentenceInfo({ sentence, translation: "Translation failed" });
    } finally {
      setIsLoadingSentence(false);
    }
  };

  const translateAll = async () => {
    if (!text?.content || !id) return;

    if (parallelTranslations.length > 0) {
      setShowParallelView(true);
      return;
    }

    setIsTranslatingAll(true);
    setShowParallelView(true);
    try {
      const response = await textsApi.translateAll(id, nativeLanguage);
      setParallelTranslations(response.data.sentences);
    } catch (error) {
      console.error("Parallel translation error:", error);
    } finally {
      setIsTranslatingAll(false);
    }
  };

  // Word styling
  const getWordStyle = (word: string) => {
    const clean = cleanWord(word);

    if (markedWords.has(clean) && highlightLearned) {
      return "text-primary-600 bg-primary-100";
    }
    if (markedLearningWords.has(clean) && highlightLearning) {
      return "text-warning-600 bg-warning-100";
    }
    if (newWordsSet.has(clean) && highlightNew) {
      return "text-secondary-600 font-medium";
    }
    return "text-owl-800";
  };

  // Render normal content
  const renderContent = () => {
    if (!text?.content) return null;
    const sentences = splitSentences(text.content);

    return (
      <Text className="text-lg leading-8" style={{ fontFamily: "serif" }}>
        {sentences.map((sentence, sIdx) => {
          const isActive = speakingIdx === sIdx;
          return (
            <Text key={sIdx} className="text-lg">
              {sentence.split(/(\s+)/).map((part, wIdx) => {
                if (/^\s+$/.test(part)) {
                  return <Text key={`${sIdx}-${wIdx}`}>{part}</Text>;
                }

                return (
                  <View className="px-0.5 -mx-0.5" key={`${sIdx}-${wIdx}`}>
                    <Text
                      onPress={() => handleWordPress(part, sentence)}
                      onLongPress={() => handleSentencePress(sentence)}
                      style={{
                        fontFamily: "serif",
                        ...(isActive ? { textDecorationLine: "underline", textDecorationStyle: "dashed" } : {}),
                      }}
                      className={`rounded-md px-px ${getWordStyle(part)}`}
                    >
                      {part}
                    </Text>
                  </View>
                );
              })}
              {" "}
            </Text>
          );
        })}
      </Text>
    );
  };

  // Render parallel content
  const renderParallelContent = () => {
    if (!text?.content) return null;

    if (isTranslatingAll) {
      return (
        <View className="items-center py-12">
          <View className="w-16 h-16 rounded-2xl bg-owl-200 items-center justify-center mb-4">
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
          <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700">Translating text...</Text>
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm mt-1">This will be cached for future visits.</Text>
        </View>
      );
    }

    const sentences = splitSentences(text.content);

    return sentences.map((sentence, sIdx) => {
      const trans = parallelTranslations[sIdx];
      const displayTranslation = useLiteralTranslation
        ? trans?.literalTranslation || trans?.translation
        : trans?.translation;

      return (
        <View
          key={sIdx}
          className={`py-3 border-b border-owl-200 ${
            speakingIdx === sIdx ? "bg-primary-200 rounded-xl -mx-2 px-2" : ""
          }`}
        >
          <View className="flex-row items-start gap-2">
            <TouchableOpacity
              onPress={() => speak(sentence)}
              className="mt-1 w-8 h-8 rounded-lg bg-owl-200 items-center justify-center"
            >
              <Ionicons name="volume-medium" size={14} color="#8b5cf6" />
            </TouchableOpacity>
            <Text className="flex-1 text-base leading-7 text-owl-800" style={{ fontFamily: "serif" }}>
              {sentence.split(/(\s+)/).map((part, wIdx) => {
                if (/^\s+$/.test(part)) {
                  return <Text key={`${sIdx}-${wIdx}`}>{part}</Text>;
                }

                // const clean = cleanWord(part);
                // if (!clean || clean.length < 2) {
                //   return <Text key={`${sIdx}-${wIdx}`}>{part}</Text>;
                // }

                return (
                  <View className="px-0.5 -mx-0.5" key={`${sIdx}-${wIdx}`}>
                    <Text
                      onPress={() => handleWordPress(part, sentence)}
                      onLongPress={() => handleSentencePress(sentence)}
                      style={{ fontFamily: "serif" }}
                      className={`rounded-md px-px ${getWordStyle(part)}`}
                    >
                      {part}
                    </Text>
                  </View>
                );
              })}
            </Text>
          </View>
          <View className="ml-10 mt-2 pl-3 border-l-2 border-primary-400">
            {trans == null ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-sm text-owl-500 italic">{displayTranslation}</Text>
            )}
          </View>
        </View>
      );
    });
  };

  if (isLoadingText) {
    return (
      <View className="flex-1 items-center justify-center bg-owl-50">
        <View className="w-20 h-20 rounded-2xl bg-owl-200 items-center justify-center mb-4">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 mt-2">Loading your text...</Text>
      </View>
    );
  }

  if (error || !text) {
    return (
      <View className="flex-1 items-center justify-center bg-owl-50 p-8">
        <View className="w-24 h-24 rounded-2xl bg-danger-200 items-center justify-center mb-4">
          <Text className="text-4xl">😕</Text>
        </View>
        <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-xl mt-2">Failed to load text</Text>
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-center mt-2">Something went wrong</Text>
        <View className="mt-6">
          <GradientButton
            title="Go Back"
            onPress={() => router.back()}
            variant="primary"
          />
        </View>
      </View>
    );
  }

  const difficultyConfig = {
    beginner: { colors: ["#10b981", "#059669"] as [string, string], emoji: "🌱" },
    intermediate: { colors: ["#f59e0b", "#d97706"] as [string, string], emoji: "📖" },
    advanced: { colors: ["#ef4444", "#dc2626"] as [string, string], emoji: "🔥" },
  };

  const difficulty = difficultyConfig[text.difficulty as keyof typeof difficultyConfig] || difficultyConfig.intermediate;

  return (
    <>
      <Stack.Screen options={{ title: text.title || text.topic || "Reading" }} />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-owl-50">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Hero Header */}
          <View className="bg-owl-100 px-6 pt-5 pb-6" style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-2xl text-owl-900">{text.title || text.topic}</Text>
              <View className="flex-row items-center gap-2 mt-3 flex-wrap">
                <View className="bg-owl-200 px-3 py-1.5 rounded-full flex-row items-center">
                  <Text className="text-sm mr-1">🌍</Text>
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700 text-xs">{text.language}</Text>
                </View>
                <View style={{ backgroundColor: difficulty.colors[0] }} className="px-3 py-1.5 rounded-full flex-row items-center">
                  <Text className="text-sm mr-1">{difficulty.emoji}</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-xs capitalize">
                    {text.difficulty}
                  </Text>
                </View>
                <View className="bg-owl-200 px-3 py-1.5 rounded-full flex-row items-center">
                  <Text className="text-sm mr-1">📝</Text>
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700 text-xs">{text.wordCount} words</Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Playback Controls */}
          <Animated.View 
            entering={FadeInUp.delay(200).springify()}
            className="px-6 -mt-4"
          >
            <View className="bg-owl-100 rounded-2xl p-4">
              <View className="flex-row items-center gap-2 flex-wrap">
                {/* Speed control */}
                <View className="flex-row items-center bg-owl-200 rounded-xl px-1 py-1">
                  <TouchableOpacity
                    onPress={() => updateSpeechRate(Math.max(0.5, speechRate - 0.1))}
                    className="w-8 h-8 items-center justify-center"
                  >
                    <Text className="text-owl-600 font-bold">−</Text>
                  </TouchableOpacity>
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="w-12 text-center text-xs text-owl-700">
                    {speechRate.toFixed(1)}×
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateSpeechRate(Math.min(2.0, speechRate + 0.1))}
                    className="w-8 h-8 items-center justify-center"
                  >
                    <Text className="text-owl-600 font-bold">+</Text>
                  </TouchableOpacity>
                </View>

                {/* Play/Stop */}
                {isSpeaking ? (
                  <TouchableOpacity
                    onPress={stopSpeaking}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-danger-500"
                  >
                    <Ionicons name="stop" size={14} color="white" />
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-sm">Stop</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={speakAll}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500"
                  >
                    <Ionicons name="play" size={14} color="white" />
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-sm">Read</Text>
                  </TouchableOpacity>
                )}

                {/* Translate All */}
                {parallelTranslations.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setShowParallelView(!showParallelView)}
                    activeOpacity={0.7}
                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl ${showParallelView ? "bg-secondary-500" : "bg-owl-200"}`}
                  >
                    <Ionicons
                      name={showParallelView ? "eye-off" : "eye"}
                      size={14}
                      color={showParallelView ? "white" : themeColors.owl700}
                    />
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-sm ${
                      showParallelView ? "text-white" : "text-owl-700"
                    }`}>
                      Translation
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={translateAll}
                    disabled={isTranslatingAll}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary-500"
                  >
                    {isTranslatingAll ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="language" size={14} color="white" />
                    )}
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-sm">
                      {isTranslatingAll ? "..." : "Translate"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Literal/Natural toggle */}
          {showParallelView && parallelTranslations.length > 0 && (
            <View className="px-5 mt-3">
              <View className="flex-row rounded-xl overflow-hidden self-start bg-owl-200">
                <TouchableOpacity
                  onPress={() => setUseLiteralTranslation(false)}
                  activeOpacity={0.7}
                  className={`px-4 py-2 ${!useLiteralTranslation ? "bg-primary-500" : ""}`}
                >
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-sm ${!useLiteralTranslation ? "text-white" : "text-owl-600"}`}>
                    Natural
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setUseLiteralTranslation(true)}
                  activeOpacity={0.7}
                  className={`px-4 py-2 ${useLiteralTranslation ? "bg-primary-500" : ""}`}
                >
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-sm ${useLiteralTranslation ? "text-white" : "text-owl-600"}`}>
                    Literal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tip */}
          <View className="mx-6 mt-4 p-4 rounded-2xl flex-row items-center bg-owl-100">
            <View className="w-10 h-10 rounded-xl bg-owl-200 items-center justify-center mr-3">
              <Text className="text-xl">💡</Text>
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-owl-600">
                Tap any word to translate. Long-press a sentence for full translation.
              </Text>
            </View>
          </View>

          {/* Content */}
          <View className="px-6 py-4">
            <View className="bg-owl-100 rounded-2xl p-4">
              {showParallelView ? renderParallelContent() : renderContent()}
            </View>
          </View>

          {/* Difficulty Controls */}
          <View className="mx-6 mb-4">
            <View className="bg-owl-100 rounded-2xl p-4">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-xl bg-owl-200 items-center justify-center mr-2">
                  <Text className="text-base">🎚️</Text>
                </View>
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-700">Adjust difficulty</Text>
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => simplifyMutation.mutate()}
                  disabled={simplifyMutation.isPending || text.difficulty === "beginner"}
                  className={`flex-1 rounded-xl py-3 items-center ${text.difficulty === "beginner" ? "bg-owl-200" : "bg-primary-500"}`}
                  activeOpacity={0.7}
                >
                  {simplifyMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <View className="flex-row items-center gap-1">
                      <Text className="text-lg">⬇️</Text>
                      <Text style={{ fontFamily: "Nunito_700Bold" }} className={text.difficulty === "beginner" ? "text-owl-400" : "text-white"}>
                        Simplify
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => harderMutation.mutate()}
                  disabled={harderMutation.isPending || text.difficulty === "advanced"}
                  className={`flex-1 rounded-xl py-3 items-center ${text.difficulty === "advanced" ? "bg-owl-200" : "bg-danger-500"}`}
                  activeOpacity={0.7}
                >
                  {harderMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <View className="flex-row items-center gap-1">
                      <Text className="text-lg">⬆️</Text>
                      <Text style={{ fontFamily: "Nunito_700Bold" }} className={text.difficulty === "advanced" ? "text-owl-400" : "text-white"}>
                        Harder
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View className="mx-6 mb-4">
            <View className="bg-owl-100 rounded-2xl p-4">
              <View className="flex-row items-center gap-3">
                <View className="flex-1 bg-secondary-200 rounded-xl p-3 items-center">
                  <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-secondary-500 text-xl">
                    {text.newWordsIntroduced?.length || 0}
                  </Text>
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-secondary-600 text-xs">New words</Text>
                </View>
                <View className="flex-1 bg-primary-200 rounded-xl p-3 items-center">
                  <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-primary-500 text-xl">{markedWords.size}</Text>
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-primary-600 text-xs">Marked</Text>
                </View>
                <View className="flex-1 bg-owl-200 rounded-xl p-3 items-center">
                  <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-owl-700 text-xl">{wordsLookedUpRef.current.size}</Text>
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-600 text-xs">Looked up</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Legend */}
          <View className="mx-6 mb-8">
            <View className="bg-owl-100 rounded-2xl p-4">
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-700 mb-3">Word colors:</Text>
              <View className="flex-row flex-wrap gap-3">
                <View className="flex-row items-center bg-secondary-200 px-3 py-1.5 rounded-full">
                  <View className="w-3 h-3 rounded-full bg-secondary-400 mr-2" />
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-secondary-500">New word</Text>
                </View>
                <View className="flex-row items-center bg-warning-200 px-3 py-1.5 rounded-full">
                  <View className="w-3 h-3 rounded-full bg-warning-400 mr-2" />
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-warning-500">Learning</Text>
                </View>
                <View className="flex-row items-center bg-primary-200 px-3 py-1.5 rounded-full">
                  <View className="w-3 h-3 rounded-full bg-primary-400 mr-2" />
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-primary-500">Learned</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Word Bottom Sheet */}
        <BottomSheetModal
          ref={wordModalRef}
          snapPoints={wordSnapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
          )}
          handleIndicatorStyle={{ backgroundColor: "#ccc", width: 48 }}
          backgroundStyle={{ backgroundColor: themeColors.owl100, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
          <View className="px-6 pb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="px-4 py-2 rounded-xl bg-secondary-500">
                  <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-xl text-white">{selectedWord}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => selectedWord && speak(selectedWord)}
                  className="w-10 h-10 rounded-xl bg-owl-200 items-center justify-center"
                >
                  <Ionicons name="volume-medium" size={20} color={themeColors.owl700} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => wordModalRef.current?.dismiss()}
                className="w-8 h-8 rounded-full bg-owl-200 items-center justify-center"
              >
                <Ionicons name="close" size={20} color={themeColors.owl500} />
              </TouchableOpacity>
            </View>
          </View>

          {isLoadingWord ? (
            <View className="px-6 pb-8 items-center">
              <View className="w-16 h-16 rounded-2xl items-center justify-center mb-4 bg-secondary-500">
                <ActivityIndicator size="large" color="white" />
              </View>
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-500">Translating...</Text>
            </View>
          ) : wordInfo ? (
            <BottomSheetScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom: Math.max(insets.bottom, 24),
              }}
            >
              <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-3xl text-primary-500">
                {wordInfo.translation}
              </Text>
              {wordInfo.alternativeTranslations &&
                wordInfo.alternativeTranslations.length > 0 && (
                  <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 mt-1">
                    Also: {wordInfo.alternativeTranslations.join(", ")}
                  </Text>
                )}

              {wordInfo.partOfSpeech && (
                <View className="flex-row items-center mt-3 gap-2">
                  <View className="bg-owl-200 px-3 py-1.5 rounded-full">
                    <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-owl-600 italic">
                      {wordInfo.partOfSpeech}
                    </Text>
                  </View>
                  {wordInfo.gender && (
                    <View className="bg-owl-200 px-3 py-1.5 rounded-full">
                      <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-owl-600">{wordInfo.gender}</Text>
                    </View>
                  )}
                </View>
              )}

              {wordInfo.baseForm &&
                wordInfo.baseForm.toLowerCase() !== selectedWord?.toLowerCase() && (
                  <View className="p-3 rounded-xl mt-3 bg-secondary-200">
                    <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-secondary-600">
                      Base form: <Text style={{ fontFamily: "Nunito_700Bold" }}>{wordInfo.baseForm}</Text>
                    </Text>
                  </View>
                )}

              {wordInfo.conjugation && Object.keys(wordInfo.conjugation).length > 0 && (
                <View className="p-3 rounded-xl mt-3 bg-warning-200">
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-warning-600 text-sm">
                    {[
                      wordInfo.conjugation.tense,
                      wordInfo.conjugation.person,
                      wordInfo.conjugation.mood,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </Text>
                </View>
              )}

              {wordInfo.contextualNote && (
                <View className="p-3 rounded-xl mt-3 bg-owl-200">
                  <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-600 text-sm">{wordInfo.contextualNote}</Text>
                </View>
              )}

              {selectedSentence && (
                <View className="bg-owl-200 p-3 rounded-xl mt-3">
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-owl-500 mb-1">Context:</Text>
                  <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-700 italic">"{selectedSentence}"</Text>
                </View>
              )}

              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity
                  onPress={() => selectedWord && markLearningMutation.mutate(selectedWord)}
                  disabled={
                    markedLearningWords.has(selectedWord || "") ||
                    markedWords.has(selectedWord || "")
                  }
                  className={`flex-1 rounded-xl py-3 items-center ${
                    markedLearningWords.has(selectedWord || "") ? "bg-warning-200" : "bg-owl-200"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{ fontFamily: "Nunito_700Bold" }}
                    className={markedLearningWords.has(selectedWord || "") ? "text-warning-600" : "text-owl-700"}
                  >
                    {markedLearningWords.has(selectedWord || "") ? "📚 Learning" : "Mark Learning"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => selectedWord && markLearnedMutation.mutate(selectedWord)}
                  disabled={markedWords.has(selectedWord || "")}
                  className={`flex-1 rounded-xl py-3 items-center ${
                    markedWords.has(selectedWord || "") ? "bg-primary-200" : "bg-primary-500"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className={`${
                    markedWords.has(selectedWord || "") ? "text-primary-600" : "text-white"
                  }`}>
                    {markedWords.has(selectedWord || "") ? "✅ Learned" : "Mark Learned"}
                  </Text>
                </TouchableOpacity>
              </View>
            </BottomSheetScrollView>
          ) : (
            <View className="px-6 pb-8 items-center">
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500">Failed to translate. Try again.</Text>
            </View>
          )}
        </BottomSheetModal>

        {/* Sentence Bottom Sheet */}
        <BottomSheetModal
          ref={sentenceModalRef}
          snapPoints={sentenceSnapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
          )}
          handleIndicatorStyle={{ backgroundColor: "#ccc", width: 48 }}
          backgroundStyle={{ backgroundColor: themeColors.owl100, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
          <View className="px-6 pb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-owl-200 items-center justify-center">
                  <Text className="text-xl">📝</Text>
                </View>
                <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-xl text-owl-900">Sentence</Text>
                <TouchableOpacity
                  onPress={() => selectedSentence && speak(selectedSentence)}
                  className="w-10 h-10 rounded-xl bg-owl-200 items-center justify-center"
                >
                  <Ionicons name="volume-medium" size={20} color={themeColors.owl700} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => sentenceModalRef.current?.dismiss()}
                className="w-8 h-8 rounded-full bg-owl-200 items-center justify-center"
              >
                <Ionicons name="close" size={20} color={themeColors.owl500} />
              </TouchableOpacity>
            </View>
          </View>

          {isLoadingSentence ? (
            <View className="px-6 pb-8 items-center">
              <View className="w-16 h-16 rounded-2xl items-center justify-center mb-4 bg-secondary-500">
                <ActivityIndicator size="large" color="white" />
              </View>
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-500">Translating...</Text>
            </View>
          ) : sentenceInfo ? (
            <BottomSheetScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom: Math.max(insets.bottom, 24),
              }}
            >
              <View className="bg-owl-200 p-4 rounded-xl mb-4">
                <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-700 italic text-base leading-6">{selectedSentence}</Text>
              </View>

              <View className="p-4 rounded-xl mb-4 bg-secondary-200">
                <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-lg text-secondary-600">
                  {sentenceInfo.translation}
                </Text>
              </View>

              {sentenceInfo.literalTranslation && (
                <View className="bg-owl-200 p-4 rounded-xl mb-4">
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-sm text-owl-700 mb-1">
                    Word-for-word
                  </Text>
                  <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-sm text-owl-600">
                    {sentenceInfo.literalTranslation}
                  </Text>
                </View>
              )}

              {sentenceInfo.grammarNotes && sentenceInfo.grammarNotes.length > 0 && (
                <View className="p-4 rounded-xl bg-secondary-200">
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-sm text-secondary-600 mb-2">
                    Grammar Notes 📚
                  </Text>
                  {sentenceInfo.grammarNotes.map((note, idx) => (
                    <View key={idx} className="mb-2 bg-owl-100 p-2 rounded-lg">
                      <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-sm text-secondary-500">
                        <Text style={{ fontFamily: "Nunito_700Bold" }}>{note.element}:</Text>{" "}
                        {note.explanation}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </BottomSheetScrollView>
          ) : (
            <View className="px-6 pb-8 items-center">
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500">Failed to translate. Try again.</Text>
            </View>
          )}
        </BottomSheetModal>
      </SafeAreaView>
    </>
  );
}
