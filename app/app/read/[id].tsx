import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { textsApi, translateApi, vocabularyApi, generateApi } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { GradientButton } from "../../src/components/ui";

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
  const [showWordModal, setShowWordModal] = useState(false);
  const [showSentenceModal, setShowSentenceModal] = useState(false);

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

  useEffect(() => {
    return () => {
      if (sessionUpdateTimeoutRef.current) {
        clearTimeout(sessionUpdateTimeoutRef.current);
      }
    };
  }, []);

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
    const clean = cleanWord(word);
    if (!clean || clean.length < 2) return;

    setSelectedWord(clean);
    setSelectedSentence(sentence);
    setShowWordModal(true);
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
    setSelectedSentence(sentence);
    setShowSentenceModal(true);
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
      return "bg-green-100 text-green-800";
    }
    if (markedLearningWords.has(clean) && highlightLearning) {
      return "bg-yellow-100 text-yellow-800";
    }
    if (newWordsSet.has(clean) && highlightNew) {
      return "text-primary-700 font-medium";
    }
    return "text-gray-800";
  };

  // Render normal content
  const renderContent = () => {
    if (!text?.content) return null;
    const sentences = splitSentences(text.content);

    return sentences.map((sentence, sIdx) => (
      <Pressable
        key={sIdx}
        onLongPress={() => handleSentencePress(sentence)}
        delayLongPress={400}
      >
        <Text
          className={`text-lg leading-8 mb-2 rounded px-1 ${
            speakingIdx === sIdx ? "bg-primary-100" : ""
          }`}
        >
          {sentence.split(/(\s+)/).map((part, wIdx) => {
            if (/^\s+$/.test(part)) {
              return <Text key={`${sIdx}-${wIdx}`}>{part}</Text>;
            }

            const clean = cleanWord(part);
            if (!clean || clean.length < 2) {
              return <Text key={`${sIdx}-${wIdx}`}>{part}</Text>;
            }

            return (
              <Text
                key={`${sIdx}-${wIdx}`}
                onPress={() => handleWordPress(part, sentence)}
                className={`rounded px-0.5 ${getWordStyle(part)}`}
              >
                {part}
              </Text>
            );
          })}
          {" "}
        </Text>
      </Pressable>
    ));
  };

  // Render parallel content
  const renderParallelContent = () => {
    if (!text?.content) return null;

    if (isTranslatingAll) {
      return (
        <View className="items-center py-12">
          <LinearGradient
            colors={["#a855f7", "#7c3aed"]}
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
          >
            <ActivityIndicator size="large" color="white" />
          </LinearGradient>
          <Text className="text-gray-700 font-medium">Translating text...</Text>
          <Text className="text-gray-500 text-sm mt-1">This will be cached for future visits.</Text>
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
          className={`py-3 border-b border-gray-100 ${
            speakingIdx === sIdx ? "bg-primary-50 rounded-xl -mx-2 px-2" : ""
          }`}
        >
          <View className="flex-row items-start gap-2">
            <TouchableOpacity
              onPress={() => speak(sentence)}
              className="mt-1 w-8 h-8 rounded-lg bg-purple-50 items-center justify-center"
            >
              <Ionicons name="volume-medium" size={14} color="#a855f7" />
            </TouchableOpacity>
            <Pressable
              onLongPress={() => handleSentencePress(sentence)}
              className="flex-1"
            >
              <Text className="text-base leading-7 text-gray-900">
                {sentence.split(/(\s+)/).map((part, wIdx) => {
                  if (/^\s+$/.test(part)) {
                    return <Text key={`${sIdx}-${wIdx}`}>{part}</Text>;
                  }
                  const clean = cleanWord(part);
                  if (!clean || clean.length < 2) {
                    return <Text key={`${sIdx}-${wIdx}`}>{part}</Text>;
                  }
                  return (
                    <Text
                      key={`${sIdx}-${wIdx}`}
                      onPress={() => handleWordPress(part, sentence)}
                      className={`rounded px-0.5 ${getWordStyle(part)}`}
                    >
                      {part}
                    </Text>
                  );
                })}
              </Text>
            </Pressable>
          </View>
          <View className="ml-10 mt-2 pl-3 border-l-2 border-primary-300">
            {trans == null ? (
              <ActivityIndicator size="small" color="#a855f7" />
            ) : (
              <Text className="text-sm text-gray-600 italic">{displayTranslation}</Text>
            )}
          </View>
        </View>
      );
    });
  };

  if (isLoadingText) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <LinearGradient
          colors={["#2a94ff", "#a855f7"]}
          className="w-20 h-20 rounded-3xl items-center justify-center mb-4"
        >
          <ActivityIndicator size="large" color="white" />
        </LinearGradient>
        <Text className="text-gray-500 mt-2">Loading your text...</Text>
      </View>
    );
  }

  if (error || !text) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-8">
        <LinearGradient
          colors={["#fee2e2", "#fecaca"]}
          className="w-24 h-24 rounded-3xl items-center justify-center mb-4"
        >
          <Text className="text-4xl">😕</Text>
        </LinearGradient>
        <Text className="text-gray-700 text-xl font-bold mt-2">Failed to load text</Text>
        <Text className="text-gray-500 text-center mt-2">Something went wrong</Text>
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
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-slate-50">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Hero Header */}
          <LinearGradient
            colors={["#2a94ff", "#6366f1", "#a855f7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-5 pt-4 pb-6"
            style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
          >
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Text className="text-2xl font-bold text-white">{text.title || text.topic}</Text>
              <View className="flex-row items-center gap-2 mt-3 flex-wrap">
                <View className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center">
                  <Text className="text-sm mr-1">🌍</Text>
                  <Text className="text-white text-xs font-medium">{text.language}</Text>
                </View>
                <LinearGradient
                  colors={difficulty.colors}
                  className="px-3 py-1.5 rounded-full flex-row items-center"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text className="text-sm mr-1">{difficulty.emoji}</Text>
                  <Text className="text-white text-xs font-bold capitalize">
                    {text.difficulty}
                  </Text>
                </LinearGradient>
                <View className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center">
                  <Text className="text-sm mr-1">📝</Text>
                  <Text className="text-white text-xs font-medium">{text.wordCount} words</Text>
                </View>
              </View>
            </Animated.View>
          </LinearGradient>

          {/* Playback Controls */}
          <Animated.View 
            entering={FadeInUp.delay(200).springify()}
            className="px-5 -mt-4"
          >
            <LinearGradient
              colors={["#ffffff", "#f8fafc"]}
              className="rounded-2xl p-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <View className="flex-row items-center gap-2 flex-wrap">
                {/* Speed control */}
                <View className="flex-row items-center bg-gray-100 rounded-xl px-1 py-1">
                  <TouchableOpacity
                    onPress={() => updateSpeechRate(Math.max(0.5, speechRate - 0.1))}
                    className="w-8 h-8 items-center justify-center"
                  >
                    <Text className="text-gray-600 font-bold">−</Text>
                  </TouchableOpacity>
                  <Text className="w-12 text-center text-xs font-bold text-gray-700">
                    {speechRate.toFixed(1)}×
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateSpeechRate(Math.min(2.0, speechRate + 0.1))}
                    className="w-8 h-8 items-center justify-center"
                  >
                    <Text className="text-gray-600 font-bold">+</Text>
                  </TouchableOpacity>
                </View>

                {/* Play/Stop */}
                {isSpeaking ? (
                  <TouchableOpacity
                    onPress={stopSpeaking}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#ef4444", "#dc2626"]}
                      className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl"
                    >
                      <Ionicons name="stop" size={14} color="white" />
                      <Text className="text-white text-sm font-bold">Stop</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={speakAll}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#10b981", "#059669"]}
                      className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl"
                    >
                      <Ionicons name="play" size={14} color="white" />
                      <Text className="text-white text-sm font-bold">Read All</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* Translate All */}
                {parallelTranslations.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setShowParallelView(!showParallelView)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={showParallelView ? ["#2a94ff", "#1a75ff"] : ["#f8fafc", "#f1f5f9"]}
                      className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl"
                      style={{ borderWidth: showParallelView ? 0 : 1, borderColor: "#e2e8f0" }}
                    >
                      <Ionicons
                        name={showParallelView ? "eye-off" : "eye"}
                        size={14}
                        color={showParallelView ? "white" : "#374151"}
                      />
                      <Text className={`text-sm font-bold ${showParallelView ? "text-white" : "text-gray-700"}`}>
                        Translation
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={translateAll}
                    disabled={isTranslatingAll}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#a855f7", "#7c3aed"]}
                      className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl"
                    >
                      {isTranslatingAll ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons name="language" size={14} color="white" />
                      )}
                      <Text className="text-white text-sm font-bold">
                        {isTranslatingAll ? "..." : "Translate All"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Literal/Natural toggle */}
          {showParallelView && parallelTranslations.length > 0 && (
            <View className="px-5 mt-3">
              <View className="flex-row rounded-xl overflow-hidden self-start bg-gray-100">
                <TouchableOpacity
                  onPress={() => setUseLiteralTranslation(false)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={!useLiteralTranslation ? ["#2a94ff", "#1a75ff"] : ["#f1f5f9", "#f1f5f9"]}
                    className="px-4 py-2"
                  >
                    <Text className={`text-sm font-bold ${!useLiteralTranslation ? "text-white" : "text-gray-600"}`}>
                      Natural
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setUseLiteralTranslation(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={useLiteralTranslation ? ["#2a94ff", "#1a75ff"] : ["#f1f5f9", "#f1f5f9"]}
                    className="px-4 py-2"
                  >
                    <Text className={`text-sm font-bold ${useLiteralTranslation ? "text-white" : "text-gray-600"}`}>
                      Literal
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tip */}
          <LinearGradient
            colors={["#dbeafe", "#bfdbfe"]}
            className="mx-5 mt-4 p-4 rounded-2xl flex-row items-center"
          >
            <View className="w-10 h-10 rounded-xl bg-white/60 items-center justify-center mr-3">
              <Text className="text-xl">💡</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-blue-800 font-medium">
                Tap any word to translate. Long-press a sentence for full translation.
              </Text>
            </View>
          </LinearGradient>

          {/* Content */}
          <View className="px-5 py-4">
            <LinearGradient
              colors={["#ffffff", "#f8fafc"]}
              className="rounded-2xl p-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {showParallelView ? renderParallelContent() : renderContent()}
            </LinearGradient>
          </View>

          {/* Difficulty Controls */}
          <View className="mx-5 mb-4">
            <LinearGradient
              colors={["#ffffff", "#f8fafc"]}
              className="rounded-2xl p-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-xl bg-purple-100 items-center justify-center mr-2">
                  <Text className="text-base">🎚️</Text>
                </View>
                <Text className="font-bold text-gray-700">Adjust difficulty</Text>
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => simplifyMutation.mutate()}
                  disabled={simplifyMutation.isPending || text.difficulty === "beginner"}
                  className="flex-1 overflow-hidden rounded-xl"
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={text.difficulty === "beginner" ? ["#f1f5f9", "#e2e8f0"] : ["#10b981", "#059669"]}
                    className="py-3 items-center"
                  >
                    {simplifyMutation.isPending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <View className="flex-row items-center gap-1">
                        <Text className="text-lg">⬇️</Text>
                        <Text className={`font-bold ${text.difficulty === "beginner" ? "text-gray-400" : "text-white"}`}>
                          Simplify
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => harderMutation.mutate()}
                  disabled={harderMutation.isPending || text.difficulty === "advanced"}
                  className="flex-1 overflow-hidden rounded-xl"
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={text.difficulty === "advanced" ? ["#f1f5f9", "#e2e8f0"] : ["#ef4444", "#dc2626"]}
                    className="py-3 items-center"
                  >
                    {harderMutation.isPending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <View className="flex-row items-center gap-1">
                        <Text className="text-lg">⬆️</Text>
                        <Text className={`font-bold ${text.difficulty === "advanced" ? "text-gray-400" : "text-white"}`}>
                          Harder
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Stats */}
          <View className="mx-5 mb-4">
            <LinearGradient
              colors={["#ffffff", "#f8fafc"]}
              className="rounded-2xl p-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center gap-3">
                <View className="flex-1 bg-primary-50 rounded-xl p-3 items-center">
                  <Text className="text-primary-600 font-bold text-xl">
                    {text.newWordsIntroduced?.length || 0}
                  </Text>
                  <Text className="text-primary-700 text-xs">New words</Text>
                </View>
                <View className="flex-1 bg-green-50 rounded-xl p-3 items-center">
                  <Text className="text-green-600 font-bold text-xl">{markedWords.size}</Text>
                  <Text className="text-green-700 text-xs">Marked</Text>
                </View>
                <View className="flex-1 bg-purple-50 rounded-xl p-3 items-center">
                  <Text className="text-purple-600 font-bold text-xl">{wordsLookedUpRef.current.size}</Text>
                  <Text className="text-purple-700 text-xs">Looked up</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Legend */}
          <View className="mx-5 mb-8">
            <LinearGradient
              colors={["#ffffff", "#f8fafc"]}
              className="rounded-2xl p-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Text className="font-bold text-gray-700 mb-3">Word colors:</Text>
              <View className="flex-row flex-wrap gap-3">
                <View className="flex-row items-center bg-primary-50 px-3 py-1.5 rounded-full">
                  <View className="w-3 h-3 rounded-full bg-primary-400 mr-2" />
                  <Text className="text-sm text-primary-700 font-medium">New word</Text>
                </View>
                <View className="flex-row items-center bg-yellow-50 px-3 py-1.5 rounded-full">
                  <View className="w-3 h-3 rounded-full bg-yellow-400 mr-2" />
                  <Text className="text-sm text-yellow-700 font-medium">Learning</Text>
                </View>
                <View className="flex-row items-center bg-green-50 px-3 py-1.5 rounded-full">
                  <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                  <Text className="text-sm text-green-700 font-medium">Learned</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>

        {/* Word Modal */}
        <Modal
          visible={showWordModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowWordModal(false)}
        >
          <Pressable
            className="flex-1 justify-end bg-black/50"
            onPress={() => setShowWordModal(false)}
          >
            <Pressable>
              <LinearGradient
                colors={["#ffffff", "#f8fafc"]}
                className="rounded-t-3xl p-6 max-h-[70%]"
              >
                <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
                
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-3">
                    <LinearGradient
                      colors={["#2a94ff", "#6366f1"]}
                      className="px-4 py-2 rounded-xl"
                    >
                      <Text className="text-xl font-bold text-white">{selectedWord}</Text>
                    </LinearGradient>
                    <TouchableOpacity 
                      onPress={() => selectedWord && speak(selectedWord)}
                      className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center"
                    >
                      <Ionicons name="volume-medium" size={20} color="#a855f7" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowWordModal(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <Ionicons name="close" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {isLoadingWord ? (
                  <View className="py-8 items-center">
                    <LinearGradient
                      colors={["#2a94ff", "#a855f7"]}
                      className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
                    >
                      <ActivityIndicator size="large" color="white" />
                    </LinearGradient>
                    <Text className="text-gray-500">Translating...</Text>
                  </View>
                ) : wordInfo ? (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text className="text-3xl font-bold text-primary-600">
                      {wordInfo.translation}
                    </Text>
                    {wordInfo.alternativeTranslations &&
                      wordInfo.alternativeTranslations.length > 0 && (
                        <Text className="text-gray-500 mt-1">
                          Also: {wordInfo.alternativeTranslations.join(", ")}
                        </Text>
                      )}

                    {wordInfo.partOfSpeech && (
                      <View className="flex-row items-center mt-3 gap-2">
                        <View className="bg-gray-100 px-3 py-1.5 rounded-full">
                          <Text className="text-sm text-gray-600 italic font-medium">
                            {wordInfo.partOfSpeech}
                          </Text>
                        </View>
                        {wordInfo.gender && (
                          <View className="bg-purple-100 px-3 py-1.5 rounded-full">
                            <Text className="text-sm text-purple-600 font-medium">{wordInfo.gender}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {wordInfo.baseForm &&
                      wordInfo.baseForm.toLowerCase() !== selectedWord?.toLowerCase() && (
                        <LinearGradient
                          colors={["#dbeafe", "#bfdbfe"]}
                          className="p-3 rounded-xl mt-3"
                        >
                          <Text className="text-blue-800">
                            Base form: <Text className="font-bold">{wordInfo.baseForm}</Text>
                          </Text>
                        </LinearGradient>
                      )}

                    {wordInfo.conjugation && Object.keys(wordInfo.conjugation).length > 0 && (
                      <LinearGradient
                        colors={["#ffedd5", "#fed7aa"]}
                        className="p-3 rounded-xl mt-3"
                      >
                        <Text className="text-orange-800 text-sm font-medium">
                          {[
                            wordInfo.conjugation.tense,
                            wordInfo.conjugation.person,
                            wordInfo.conjugation.mood,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </Text>
                      </LinearGradient>
                    )}

                    {wordInfo.contextualNote && (
                      <LinearGradient
                        colors={["#fef9c3", "#fef08a"]}
                        className="p-3 rounded-xl mt-3"
                      >
                        <Text className="text-yellow-800 text-sm">{wordInfo.contextualNote}</Text>
                      </LinearGradient>
                    )}

                    {selectedSentence && (
                      <View className="bg-gray-100 p-3 rounded-xl mt-3">
                        <Text className="text-sm text-gray-500 mb-1 font-medium">Context:</Text>
                        <Text className="text-gray-700 italic">"{selectedSentence}"</Text>
                      </View>
                    )}

                    <View className="flex-row gap-3 mt-6">
                      <TouchableOpacity
                        onPress={() => selectedWord && markLearningMutation.mutate(selectedWord)}
                        disabled={
                          markedLearningWords.has(selectedWord || "") ||
                          markedWords.has(selectedWord || "")
                        }
                        className="flex-1 overflow-hidden rounded-xl"
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={
                            markedLearningWords.has(selectedWord || "")
                              ? ["#fef3c7", "#fde68a"]
                              : ["#f8fafc", "#f1f5f9"]
                          }
                          className="py-3 items-center"
                          style={{ borderWidth: 1, borderColor: markedLearningWords.has(selectedWord || "") ? "#fbbf24" : "#e2e8f0" }}
                        >
                          <Text className={`font-bold ${
                            markedLearningWords.has(selectedWord || "") ? "text-yellow-700" : "text-gray-700"
                          }`}>
                            {markedLearningWords.has(selectedWord || "") ? "📚 Learning" : "Mark Learning"}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => selectedWord && markLearnedMutation.mutate(selectedWord)}
                        disabled={markedWords.has(selectedWord || "")}
                        className="flex-1 overflow-hidden rounded-xl"
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={
                            markedWords.has(selectedWord || "")
                              ? ["#d1fae5", "#a7f3d0"]
                              : ["#10b981", "#059669"]
                          }
                          className="py-3 items-center"
                        >
                          <Text className={`font-bold ${
                            markedWords.has(selectedWord || "") ? "text-green-700" : "text-white"
                          }`}>
                            {markedWords.has(selectedWord || "") ? "✅ Learned" : "Mark Learned"}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                ) : (
                  <View className="py-8 items-center">
                    <Text className="text-gray-500">Failed to translate. Try again.</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Sentence Modal */}
        <Modal
          visible={showSentenceModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSentenceModal(false)}
        >
          <Pressable
            className="flex-1 justify-end bg-black/50"
            onPress={() => setShowSentenceModal(false)}
          >
            <Pressable>
              <LinearGradient
                colors={["#ffffff", "#f8fafc"]}
                className="rounded-t-3xl p-6 max-h-[70%]"
              >
                <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
                
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center">
                      <Text className="text-xl">📝</Text>
                    </View>
                    <Text className="text-xl font-bold text-gray-900">Sentence</Text>
                    <TouchableOpacity
                      onPress={() => selectedSentence && speak(selectedSentence)}
                      className="w-10 h-10 rounded-xl bg-primary-100 items-center justify-center"
                    >
                      <Ionicons name="volume-medium" size={20} color="#2a94ff" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowSentenceModal(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <Ionicons name="close" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {isLoadingSentence ? (
                  <View className="py-8 items-center">
                    <LinearGradient
                      colors={["#a855f7", "#7c3aed"]}
                      className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
                    >
                      <ActivityIndicator size="large" color="white" />
                    </LinearGradient>
                    <Text className="text-gray-500">Translating...</Text>
                  </View>
                ) : sentenceInfo ? (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="bg-gray-100 p-4 rounded-xl mb-4">
                      <Text className="text-gray-700 italic text-base leading-6">{selectedSentence}</Text>
                    </View>

                    <LinearGradient
                      colors={["#dbeafe", "#bfdbfe"]}
                      className="p-4 rounded-xl mb-4"
                    >
                      <Text className="text-lg font-medium text-blue-900">
                        {sentenceInfo.translation}
                      </Text>
                    </LinearGradient>

                    {sentenceInfo.literalTranslation && (
                      <LinearGradient
                        colors={["#f3e8ff", "#e9d5ff"]}
                        className="p-4 rounded-xl mb-4"
                      >
                        <Text className="text-sm font-bold text-purple-800 mb-1">
                          Word-for-word
                        </Text>
                        <Text className="text-sm text-purple-700">
                          {sentenceInfo.literalTranslation}
                        </Text>
                      </LinearGradient>
                    )}

                    {sentenceInfo.grammarNotes && sentenceInfo.grammarNotes.length > 0 && (
                      <LinearGradient
                        colors={["#dbeafe", "#bfdbfe"]}
                        className="p-4 rounded-xl"
                      >
                        <Text className="text-sm font-bold text-blue-800 mb-2">
                          Grammar Notes 📚
                        </Text>
                        {sentenceInfo.grammarNotes.map((note, idx) => (
                          <View key={idx} className="mb-2 bg-white/50 p-2 rounded-lg">
                            <Text className="text-sm text-blue-700">
                              <Text className="font-bold">{note.element}:</Text>{" "}
                              {note.explanation}
                            </Text>
                          </View>
                        ))}
                      </LinearGradient>
                    )}
                  </ScrollView>
                ) : (
                  <View className="py-8 items-center">
                    <Text className="text-gray-500">Failed to translate. Try again.</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}
