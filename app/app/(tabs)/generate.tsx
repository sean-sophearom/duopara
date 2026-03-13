import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { generateApi, settingsApi, vocabularyApi } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { Ionicons } from "@expo/vector-icons";

const topicSuggestions = [
  { icon: "cafe", label: "Café", topic: "Ordering coffee and pastries at a local café" },
  { icon: "airplane", label: "Airport", topic: "Navigating an airport and catching a flight" },
  { icon: "shirt", label: "Shopping", topic: "Shopping for clothes at a store" },
  { icon: "restaurant", label: "Restaurant", topic: "Having dinner at a restaurant" },
  { icon: "people", label: "Friends", topic: "Meeting new people and making friends" },
  { icon: "briefcase", label: "Job Interview", topic: "A job interview scenario" },
  { icon: "school", label: "University", topic: "First day at a foreign university" },
  { icon: "newspaper", label: "News", topic: "Reading about current events" },
];

const styleOptions = [
  { value: "story", label: "Story", description: "Narrative with characters" },
  { value: "dialogue", label: "Dialogue", description: "Conversation format" },
  { value: "article", label: "Article", description: "Informative style" },
  { value: "description", label: "Description", description: "Vivid descriptions" },
];

const difficultyOptions = [
  { value: "beginner", label: "Beginner", description: "Simple vocabulary" },
  { value: "intermediate", label: "Intermediate", description: "Varied structures" },
  { value: "advanced", label: "Advanced", description: "Complex & idiomatic" },
];

export default function GenerateScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const defaultLanguage = user?.settings?.targetLanguage || "Spanish";
  const defaultRatio = user?.settings?.knownWordsRatio || 80;
  const defaultDifficulty = user?.settings?.defaultDifficulty || "intermediate";

  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState(defaultLanguage);
  const [difficulty, setDifficulty] = useState(defaultDifficulty);
  const [knownWordsRatio, setKnownWordsRatio] = useState(defaultRatio);
  const [wordCount, setWordCount] = useState(200);
  const [style, setStyle] = useState("story");
  const [includeLearningWords, setIncludeLearningWords] = useState(true);
  const [includeLearnedWords, setIncludeLearnedWords] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => settingsApi.getLanguages().then((r) => r.data.languages),
  });

  const { data: vocabStats } = useQuery({
    queryKey: ["vocabulary", "stats", language],
    queryFn: () => vocabularyApi.getStats(language).then((r) => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: generateApi.create,
    onSuccess: (response) => {
      router.push(`/read/${response.data.text.id}`);
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) return;
    generateMutation.mutate({
      topic: topic.trim(),
      language,
      difficulty,
      knownWordsRatio,
      wordCount,
      style,
      includeLearningWords,
      includeLearnedWords,
    });
  };

  const knownWords =
    (includeLearnedWords
      ? (vocabStats?.learned || 0) + (vocabStats?.mastered || 0)
      : 0) + (includeLearningWords ? vocabStats?.learning || 0 : 0);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Topic Input */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            What would you like to read about?
          </Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
            <Ionicons name="bulb-outline" size={20} color="#9ca3af" />
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. A day at the beach..."
              className="flex-1 ml-3 text-gray-900"
              placeholderTextColor="#9ca3af"
              multiline
            />
          </View>

          {/* Topic Suggestions */}
          <Text className="text-sm text-gray-500 mt-4 mb-2">
            Or try one of these:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {topicSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.label}
                onPress={() => setTopic(suggestion.topic)}
                className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
              >
                <Ionicons
                  name={suggestion.icon as any}
                  size={16}
                  color="#6b7280"
                />
                <Text className="text-sm text-gray-700 ml-2">
                  {suggestion.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language Selection */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Target Language
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {(languages || [{ code: "Spanish", name: "Spanish", nativeName: "Español" }]).map(
                (lang: any) => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setLanguage(lang.code)}
                    className={`px-4 py-2 rounded-lg border ${
                      language === lang.code
                        ? "bg-primary-50 border-primary-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={
                        language === lang.code
                          ? "text-primary-700 font-medium"
                          : "text-gray-700"
                      }
                    >
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </ScrollView>
          <View className="bg-primary-50 rounded-lg p-3 mt-3">
            <Text className="text-sm text-primary-700">
              <Ionicons name="book-outline" size={14} /> You have{" "}
              <Text className="font-semibold">{knownWords}</Text> known words in{" "}
              {language}
            </Text>
          </View>
        </View>

        {/* Difficulty */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Difficulty Level
          </Text>
          <View className="gap-2">
            {difficultyOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setDifficulty(opt.value)}
                className={`p-3 rounded-lg border ${
                  difficulty === opt.value
                    ? "bg-primary-50 border-primary-500"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    difficulty === opt.value
                      ? "text-primary-700"
                      : "text-gray-900"
                  }`}
                >
                  {opt.label}
                </Text>
                <Text className="text-sm text-gray-500">{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Style */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Writing Style
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {styleOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setStyle(opt.value)}
                className={`px-4 py-2 rounded-lg border ${
                  style === opt.value
                    ? "bg-primary-50 border-primary-500"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={
                    style === opt.value
                      ? "text-primary-700 font-medium"
                      : "text-gray-700"
                  }
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Advanced Options Toggle */}
        <TouchableOpacity
          onPress={() => setShowAdvanced(!showAdvanced)}
          className="flex-row items-center justify-between bg-white rounded-xl p-4 mb-4 border border-gray-200"
        >
          <Text className="font-medium text-gray-900">Advanced Options</Text>
          <Ionicons
            name={showAdvanced ? "chevron-up" : "chevron-down"}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
            {/* Word Count */}
            <View className="mb-4">
              <Text className="font-medium text-gray-900 mb-2">
                Word Count: {wordCount}
              </Text>
              <View className="flex-row gap-2">
                {[100, 150, 200, 300, 400].map((count) => (
                  <TouchableOpacity
                    key={count}
                    onPress={() => setWordCount(count)}
                    className={`px-3 py-1 rounded-lg ${
                      wordCount === count
                        ? "bg-primary-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={
                        wordCount === count
                          ? "text-primary-700"
                          : "text-gray-600"
                      }
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Known Words Ratio */}
            <View className="mb-4">
              <Text className="font-medium text-gray-900 mb-2">
                Known Words Ratio: {knownWordsRatio}%
              </Text>
              <View className="flex-row gap-2">
                {[50, 60, 70, 80, 90].map((ratio) => (
                  <TouchableOpacity
                    key={ratio}
                    onPress={() => setKnownWordsRatio(ratio)}
                    className={`px-3 py-1 rounded-lg ${
                      knownWordsRatio === ratio
                        ? "bg-primary-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={
                        knownWordsRatio === ratio
                          ? "text-primary-700"
                          : "text-gray-600"
                      }
                    >
                      {ratio}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Include toggles */}
            <View className="gap-3">
              <TouchableOpacity
                onPress={() => setIncludeLearningWords(!includeLearningWords)}
                className="flex-row items-center"
              >
                <View
                  className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                    includeLearningWords
                      ? "bg-primary-600 border-primary-600"
                      : "border-gray-300"
                  }`}
                >
                  {includeLearningWords && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text className="text-gray-700">Include learning words</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIncludeLearnedWords(!includeLearnedWords)}
                className="flex-row items-center"
              >
                <View
                  className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                    includeLearnedWords
                      ? "bg-primary-600 border-primary-600"
                      : "border-gray-300"
                  }`}
                >
                  {includeLearnedWords && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text className="text-gray-700">Include learned words</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={!topic.trim() || generateMutation.isPending}
          className={`flex-row items-center justify-center py-4 rounded-xl mb-6 ${
            !topic.trim() || generateMutation.isPending
              ? "bg-primary-300"
              : "bg-primary-600"
          }`}
        >
          {generateMutation.isPending ? (
            <>
              <ActivityIndicator color="white" className="mr-2" />
              <Text className="text-white font-semibold text-lg">
                Generating...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">
                Generate Reading Material
              </Text>
            </>
          )}
        </TouchableOpacity>

        {generateMutation.isError && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-700">
              Failed to generate text. Please try again.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
