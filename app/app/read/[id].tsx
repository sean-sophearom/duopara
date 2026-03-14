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
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className="text-gray-500 mt-4 text-center">
            Translating text...{"\n"}This will be cached for future visits.
          </Text>
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
            speakingIdx === sIdx ? "bg-primary-50" : ""
          }`}
        >
          <View className="flex-row items-start gap-2">
            <TouchableOpacity
              onPress={() => speak(sentence)}
              className="mt-1 p-1"
            >
              <Ionicons name="volume-medium" size={16} color="#9ca3af" />
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
          <View className="ml-8 mt-2 pl-3 border-l-2 border-primary-200">
            {trans == null ? (
              <ActivityIndicator size="small" color="#0ea5e9" />
            ) : (
              <Text className="text-sm text-gray-500">{displayTranslation}</Text>
            )}
          </View>
        </View>
      );
    });
  };

  if (isLoadingText) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (error || !text) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-8">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text className="text-gray-700 text-lg mt-4">Failed to load text</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-3 bg-primary-600 rounded-lg"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: text.title || text.topic || "Reading" }} />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-white">
        <ScrollView className="flex-1">
          {/* Header */}
          <View className="px-4 pt-4 pb-2">
            <Text className="text-2xl font-bold text-gray-900">{text.title || text.topic}</Text>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="bg-primary-100 px-2 py-1 rounded">
                <Text className="text-xs text-primary-700">{text.language}</Text>
              </View>
              <View
                className={`px-2 py-1 rounded ${
                  text.difficulty === "beginner"
                    ? "bg-green-100"
                    : text.difficulty === "advanced"
                    ? "bg-red-100"
                    : "bg-yellow-100"
                }`}
              >
                <Text
                  className={`text-xs ${
                    text.difficulty === "beginner"
                      ? "text-green-700"
                      : text.difficulty === "advanced"
                      ? "text-red-700"
                      : "text-yellow-700"
                  }`}
                >
                  {text.difficulty}
                </Text>
              </View>
              <Text className="text-gray-500 text-sm">{text.wordCount} words</Text>
            </View>
          </View>

          {/* Playback Controls */}
          <View className="px-4 py-2 flex-row items-center gap-3 flex-wrap">
            {/* Speed control */}
            <View className="flex-row items-center bg-gray-100 rounded-lg px-1 py-1">
              <TouchableOpacity
                onPress={() => updateSpeechRate(Math.max(0.5, speechRate - 0.1))}
                className="w-8 h-8 items-center justify-center"
              >
                <Text className="text-gray-600 font-bold">−</Text>
              </TouchableOpacity>
              <Text className="w-12 text-center text-xs font-medium text-gray-700">
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
                className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200"
              >
                <Ionicons name="stop" size={14} color="#dc2626" />
                <Text className="text-red-600 text-sm font-medium">Stop</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={speakAll}
                className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-gray-100"
              >
                <Ionicons name="play" size={14} color="#374151" />
                <Text className="text-gray-700 text-sm font-medium">Read All</Text>
              </TouchableOpacity>
            )}

            {/* Translate All */}
            {parallelTranslations.length > 0 ? (
              <TouchableOpacity
                onPress={() => setShowParallelView(!showParallelView)}
                className={`flex-row items-center gap-2 px-3 py-2 rounded-lg ${
                  showParallelView ? "bg-primary-100" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name={showParallelView ? "eye-off" : "eye"}
                  size={14}
                  color={showParallelView ? "#0284c7" : "#374151"}
                />
                <Text
                  className={`text-sm font-medium ${
                    showParallelView ? "text-primary-700" : "text-gray-700"
                  }`}
                >
                  Translation
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={translateAll}
                disabled={isTranslatingAll}
                className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-primary-600"
              >
                {isTranslatingAll ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="language" size={14} color="#fff" />
                )}
                <Text className="text-white text-sm font-medium">
                  {isTranslatingAll ? "Translating..." : "Translate All"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Literal/Natural toggle */}
          {showParallelView && parallelTranslations.length > 0 && (
            <View className="px-4 pb-2">
              <View className="flex-row rounded-lg overflow-hidden border border-gray-200 self-start">
                <TouchableOpacity
                  onPress={() => setUseLiteralTranslation(false)}
                  className={`px-3 py-1.5 ${
                    !useLiteralTranslation ? "bg-primary-600" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      !useLiteralTranslation ? "text-white" : "text-gray-600"
                    }`}
                  >
                    Natural
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setUseLiteralTranslation(true)}
                  className={`px-3 py-1.5 ${
                    useLiteralTranslation ? "bg-primary-600" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      useLiteralTranslation ? "text-white" : "text-gray-600"
                    }`}
                  >
                    Literal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tip */}
          <View className="mx-4 mb-4 p-3 bg-primary-50 rounded-xl border border-primary-200">
            <Text className="text-sm text-primary-700">
              <Text className="font-semibold">Tip:</Text> Tap any word to translate. Long-press a
              sentence for full translation with grammar notes.
            </Text>
          </View>

          {/* Content */}
          <View className="px-4 pb-4">
            {showParallelView ? renderParallelContent() : renderContent()}
          </View>

          {/* Difficulty Controls */}
          <View className="mx-4 mb-4 p-4 bg-gray-50 rounded-xl">
            <Text className="text-sm text-gray-600 mb-3">Adjust difficulty:</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => simplifyMutation.mutate()}
                disabled={simplifyMutation.isPending || text.difficulty === "beginner"}
                className={`flex-1 py-3 rounded-xl border border-gray-300 items-center ${
                  text.difficulty === "beginner" ? "opacity-50" : ""
                }`}
              >
                {simplifyMutation.isPending ? (
                  <ActivityIndicator size="small" color="#6b7280" />
                ) : (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="chevron-down" size={16} color="#6b7280" />
                    <Text className="text-gray-700 font-medium">Simplify</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => harderMutation.mutate()}
                disabled={harderMutation.isPending || text.difficulty === "advanced"}
                className={`flex-1 py-3 rounded-xl border border-gray-300 items-center ${
                  text.difficulty === "advanced" ? "opacity-50" : ""
                }`}
              >
                {harderMutation.isPending ? (
                  <ActivityIndicator size="small" color="#6b7280" />
                ) : (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="chevron-up" size={16} color="#6b7280" />
                    <Text className="text-gray-700 font-medium">Harder</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View className="mx-4 mb-4 p-4 bg-gray-50 rounded-xl">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-4">
                <Text className="text-gray-600 text-sm">
                  <Text className="text-primary-600 font-medium">
                    {text.newWordsIntroduced?.length || 0}
                  </Text>{" "}
                  new words
                </Text>
                <Text className="text-gray-600 text-sm">
                  <Text className="text-green-600 font-medium">{markedWords.size}</Text> marked
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="book-outline" size={16} color="#6b7280" />
                <Text className="text-gray-500 text-sm">{text.language}</Text>
              </View>
            </View>
          </View>

          {/* Legend */}
          <View className="mx-4 mb-8 p-4 bg-gray-50 rounded-xl">
            <Text className="font-medium text-gray-700 mb-2">Word colors:</Text>
            <View className="flex-row flex-wrap gap-3">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded bg-primary-200 mr-2" />
                <Text className="text-sm text-gray-600">New word</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded bg-yellow-100 mr-2" />
                <Text className="text-sm text-gray-600">Learning</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded bg-green-100 mr-2" />
                <Text className="text-sm text-gray-600">Learned</Text>
              </View>
            </View>
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
            className="flex-1 justify-end bg-black/40"
            onPress={() => setShowWordModal(false)}
          >
            <Pressable className="bg-white rounded-t-3xl p-6 max-h-[70%]">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl font-bold text-gray-900">{selectedWord}</Text>
                  <TouchableOpacity onPress={() => selectedWord && speak(selectedWord)}>
                    <Ionicons name="volume-medium" size={24} color="#0ea5e9" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setShowWordModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {isLoadingWord ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#0ea5e9" />
                  <Text className="text-gray-500 mt-4">Translating...</Text>
                </View>
              ) : wordInfo ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text className="text-3xl font-semibold text-primary-600">
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
                      <View className="bg-gray-100 px-3 py-1 rounded-full">
                        <Text className="text-sm text-gray-600 italic">
                          {wordInfo.partOfSpeech}
                        </Text>
                      </View>
                      {wordInfo.gender && (
                        <View className="bg-purple-100 px-3 py-1 rounded-full">
                          <Text className="text-sm text-purple-600">{wordInfo.gender}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {wordInfo.baseForm &&
                    wordInfo.baseForm.toLowerCase() !== selectedWord?.toLowerCase() && (
                      <View className="bg-blue-50 p-3 rounded-lg mt-3">
                        <Text className="text-blue-800">
                          Base form: <Text className="font-semibold">{wordInfo.baseForm}</Text>
                        </Text>
                      </View>
                    )}

                  {wordInfo.conjugation && Object.keys(wordInfo.conjugation).length > 0 && (
                    <View className="bg-orange-50 p-3 rounded-lg mt-3">
                      <Text className="text-orange-800 text-sm">
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
                    <View className="bg-yellow-50 p-3 rounded-lg mt-3">
                      <Text className="text-yellow-800 text-sm">{wordInfo.contextualNote}</Text>
                    </View>
                  )}

                  {selectedSentence && (
                    <View className="bg-gray-50 p-3 rounded-lg mt-3">
                      <Text className="text-sm text-gray-500 mb-1">Context:</Text>
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
                      className={`flex-1 py-3 rounded-xl border ${
                        markedLearningWords.has(selectedWord || "")
                          ? "bg-yellow-50 border-yellow-300"
                          : "border-gray-300"
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          markedLearningWords.has(selectedWord || "")
                            ? "text-yellow-700"
                            : "text-gray-700"
                        }`}
                      >
                        {markedLearningWords.has(selectedWord || "")
                          ? "✓ Learning"
                          : "Mark Learning"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => selectedWord && markLearnedMutation.mutate(selectedWord)}
                      disabled={markedWords.has(selectedWord || "")}
                      className={`flex-1 py-3 rounded-xl ${
                        markedWords.has(selectedWord || "") ? "bg-green-100" : "bg-green-600"
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          markedWords.has(selectedWord || "") ? "text-green-700" : "text-white"
                        }`}
                      >
                        {markedWords.has(selectedWord || "") ? "✓ Learned" : "Mark Learned"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
                <View className="py-8 items-center">
                  <Text className="text-gray-500">Failed to translate. Try again.</Text>
                </View>
              )}
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
            className="flex-1 justify-end bg-black/40"
            onPress={() => setShowSentenceModal(false)}
          >
            <Pressable className="bg-white rounded-t-3xl p-6 max-h-[70%]">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-3">
                  <Text className="text-xl font-bold text-gray-900">Sentence Translation</Text>
                  <TouchableOpacity
                    onPress={() => selectedSentence && speak(selectedSentence)}
                  >
                    <Ionicons name="volume-medium" size={24} color="#0ea5e9" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setShowSentenceModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {isLoadingSentence ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#0ea5e9" />
                  <Text className="text-gray-500 mt-4">Translating...</Text>
                </View>
              ) : sentenceInfo ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="bg-gray-50 p-3 rounded-lg mb-4">
                    <Text className="text-gray-700 italic">{selectedSentence}</Text>
                  </View>

                  <Text className="text-lg font-medium text-gray-900 mb-4">
                    {sentenceInfo.translation}
                  </Text>

                  {sentenceInfo.literalTranslation && (
                    <View className="bg-purple-50 p-3 rounded-lg mb-4">
                      <Text className="text-sm font-medium text-purple-800 mb-1">
                        Word-for-word
                      </Text>
                      <Text className="text-sm text-purple-700">
                        {sentenceInfo.literalTranslation}
                      </Text>
                    </View>
                  )}

                  {sentenceInfo.grammarNotes && sentenceInfo.grammarNotes.length > 0 && (
                    <View className="bg-blue-50 p-3 rounded-lg">
                      <Text className="text-sm font-medium text-blue-800 mb-2">
                        Grammar Notes
                      </Text>
                      {sentenceInfo.grammarNotes.map((note, idx) => (
                        <View key={idx} className="mb-2">
                          <Text className="text-sm text-blue-700">
                            <Text className="font-medium">{note.element}:</Text>{" "}
                            {note.explanation}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              ) : (
                <View className="py-8 items-center">
                  <Text className="text-gray-500">Failed to translate. Try again.</Text>
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}
