import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { textsApi, translateApi, vocabularyApi } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
// import { splitSentences } from "@duopara/shared";
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?""»'។])\s+/).filter((s) => s.trim().length > 0);
}
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

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

export default function ReadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [markedWords, setMarkedWords] = useState<Set<string>>(new Set());
  const [markedLearningWords, setMarkedLearningWords] = useState<Set<string>>(
    new Set()
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showWordModal, setShowWordModal] = useState(false);

  const wordsLookedUpRef = useRef<Set<string>>(new Set());
  const nativeLanguage = user?.settings?.nativeLanguage || "English";

  const {
    data,
    isLoading: isLoadingText,
    error,
  } = useQuery({
    queryKey: ["text", id],
    queryFn: () => textsApi.getOne(id!).then((r) => r.data),
    enabled: !!id,
  });

  const text = data?.text;
  const knownWordsSet = new Set(
    (text?.knownWordsUsed || []).map((w: string) => w.toLowerCase())
  );
  const newWordsSet = new Set(
    (text?.newWordsIntroduced || []).map((w: string) => w.toLowerCase())
  );

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
        new Set(
          learningVocabData.words.map((w: { word: string }) =>
            w.word.toLowerCase()
          )
        )
      );
    }
  }, [learningVocabData]);

  // Start session when text loads
  useEffect(() => {
    if (!text || !id) return;

    const existingSessions = text.readingSessions || [];
    const recentSession = existingSessions[0];

    if (recentSession && !recentSession.completedAt) {
      setSessionId(recentSession.id);
      const learnedInSession = recentSession.wordsMarkedLearned || [];
      setMarkedWords(
        new Set(learnedInSession.map((w: string) => w.toLowerCase()))
      );
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

  const translateMutation = useMutation({
    mutationFn: translateApi.full,
  });

  const markLearnedMutation = useMutation({
    mutationFn: (word: string) =>
      vocabularyApi.markLearned(word, text?.language || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  const markLearningMutation = useMutation({
    mutationFn: (word: string) =>
      vocabularyApi.markLearning(word, text?.language || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  const handleWordPress = async (word: string, sentence: string) => {
    const cleanWord = word.replace(/[^\p{L}'-]/gu, "").toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return;

    setSelectedWord(cleanWord);
    setSelectedSentence(sentence);
    setShowWordModal(true);
    setIsLoadingWord(true);
    setWordInfo(null);

    // Track lookup
    wordsLookedUpRef.current.add(cleanWord);

    try {
      const response = await translateMutation.mutateAsync({
        word: cleanWord,
        sourceLanguage: text?.language || "Spanish",
        targetLanguage: nativeLanguage,
        context: sentence,
      });
      setWordInfo(response.data);
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsLoadingWord(false);
    }
  };

  const handleMarkLearned = () => {
    if (!selectedWord) return;
    markLearnedMutation.mutate(selectedWord);
    setMarkedWords(new Set([...markedWords, selectedWord]));
    setMarkedLearningWords((prev) => {
      const next = new Set(prev);
      next.delete(selectedWord);
      return next;
    });
  };

  const handleMarkLearning = () => {
    if (!selectedWord) return;
    markLearningMutation.mutate(selectedWord);
    setMarkedLearningWords(new Set([...markedLearningWords, selectedWord]));
  };

  const getWordStyle = (word: string) => {
    const cleanWord = word.replace(/[^\p{L}'-]/gu, "").toLowerCase();

    if (markedWords.has(cleanWord)) {
      return "bg-green-100 text-green-800";
    }
    if (markedLearningWords.has(cleanWord)) {
      return "bg-yellow-100 text-yellow-800";
    }
    if (newWordsSet.has(cleanWord)) {
      return "text-primary-700 font-medium";
    }
    return "text-gray-800";
  };

  const renderContent = () => {
    if (!text?.content) return null;

    const sentences = splitSentences(text.content);

    return sentences.map((sentence, sIdx) => (
      <Text key={sIdx} className="text-lg leading-8 mb-2">
        {sentence.split(/(\s+)/).map((part, wIdx) => {
          if (/^\s+$/.test(part)) {
            return <Text key={`${sIdx}-${wIdx}`}>{part}</Text>;
          }

          const cleanWord = part.replace(/[^\p{L}'-]/gu, "").toLowerCase();
          if (!cleanWord || cleanWord.length < 2) {
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
    ));
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
      <Stack.Screen
        options={{
          title: text.title || text.topic || "Reading",
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-white">
        <ScrollView className="flex-1 px-4 py-4">
          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {text.title || text.topic}
          </Text>

          {/* Meta */}
          <View className="flex-row items-center gap-2 mb-6">
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
            <Text className="text-gray-500 text-sm">
              {text.wordCount} words
            </Text>
          </View>

          {/* Content */}
          <View className="pb-8">{renderContent()}</View>

          {/* Legend */}
          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <Text className="font-medium text-gray-700 mb-2">Tap any word to translate</Text>
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
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl p-6 max-h-[70%]">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-2xl font-bold text-gray-900">
                  {selectedWord}
                </Text>
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
                <ScrollView>
                  {/* Translation */}
                  <View className="mb-4">
                    <Text className="text-3xl font-semibold text-primary-600">
                      {wordInfo.translation}
                    </Text>
                    {wordInfo.alternativeTranslations &&
                      wordInfo.alternativeTranslations.length > 0 && (
                        <Text className="text-gray-500 mt-1">
                          Also: {wordInfo.alternativeTranslations.join(", ")}
                        </Text>
                      )}
                  </View>

                  {/* Part of speech */}
                  {wordInfo.partOfSpeech && (
                    <View className="flex-row items-center mb-3">
                      <View className="bg-gray-100 px-3 py-1 rounded-full">
                        <Text className="text-sm text-gray-600 italic">
                          {wordInfo.partOfSpeech}
                        </Text>
                      </View>
                      {wordInfo.gender && (
                        <View className="bg-purple-100 px-3 py-1 rounded-full ml-2">
                          <Text className="text-sm text-purple-600">
                            {wordInfo.gender}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Base form */}
                  {wordInfo.baseForm &&
                    wordInfo.baseForm.toLowerCase() !==
                      selectedWord?.toLowerCase() && (
                      <View className="bg-blue-50 p-3 rounded-lg mb-3">
                        <Text className="text-blue-800">
                          Base form:{" "}
                          <Text className="font-semibold">
                            {wordInfo.baseForm}
                          </Text>
                        </Text>
                      </View>
                    )}

                  {/* Conjugation info */}
                  {wordInfo.conjugation &&
                    Object.keys(wordInfo.conjugation).length > 0 && (
                      <View className="bg-orange-50 p-3 rounded-lg mb-3">
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

                  {/* Context note */}
                  {wordInfo.contextualNote && (
                    <View className="bg-gray-50 p-3 rounded-lg mb-3">
                      <Text className="text-gray-700 text-sm">
                        {wordInfo.contextualNote}
                      </Text>
                    </View>
                  )}

                  {/* Context sentence */}
                  {selectedSentence && (
                    <View className="bg-gray-50 p-3 rounded-lg mb-4">
                      <Text className="text-sm text-gray-500 mb-1">
                        Context:
                      </Text>
                      <Text className="text-gray-700 italic">
                        "{selectedSentence}"
                      </Text>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View className="flex-row gap-3 mt-4">
                    <TouchableOpacity
                      onPress={handleMarkLearning}
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
                      onPress={handleMarkLearned}
                      disabled={markedWords.has(selectedWord || "")}
                      className={`flex-1 py-3 rounded-xl ${
                        markedWords.has(selectedWord || "")
                          ? "bg-green-100"
                          : "bg-green-600"
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          markedWords.has(selectedWord || "")
                            ? "text-green-700"
                            : "text-white"
                        }`}
                      >
                        {markedWords.has(selectedWord || "")
                          ? "✓ Learned"
                          : "Mark Learned"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
                <View className="py-8 items-center">
                  <Text className="text-gray-500">
                    Failed to translate. Try again.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}
