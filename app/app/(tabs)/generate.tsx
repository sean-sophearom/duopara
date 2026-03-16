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
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors } from "../../src/lib/theme";

const topicSuggestions = [
  { icon: "cafe", label: "Café", topic: "Ordering coffee and pastries at a local café" },
  { icon: "airplane", label: "Travel", topic: "Navigating an airport and catching a flight" },
  { icon: "shirt", label: "Shopping", topic: "Shopping for clothes at a store" },
  { icon: "restaurant", label: "Dining", topic: "Having dinner at a restaurant" },
  { icon: "people", label: "Friends", topic: "Meeting new people and making friends" },
  { icon: "briefcase", label: "Work", topic: "A job interview scenario" },
];

const styleOptions = [
  { value: "story", label: "Story" },
  { value: "dialogue", label: "Dialogue" },
  { value: "article", label: "Article" },
  { value: "description", label: "Description" },
];

const difficultyOptions = [
  { value: "beginner", label: "Beginner", bg: "bg-primary-500" },
  { value: "intermediate", label: "Intermediate", bg: "bg-warning-500" },
  { value: "advanced", label: "Advanced", bg: "bg-danger-500" },
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
  const colors = useThemeColors();

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
    <SafeAreaView className="flex-1 bg-owl-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 70 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-6">
          {/* Header */}
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-xl">Create</Text>
          <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-owl-900 text-4xl mt-1 mb-6">
            ✨ New Story
          </Text>

          {/* Topic Input */}
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-3">
              💭 What's your story about?
            </Text>
            <View className="bg-owl-200 rounded-xl px-4 py-1">
              <TextInput
                value={topic}
                onChangeText={setTopic}
                placeholder="e.g. A day at the beach with friends..."
                className="text-owl-800 text-base"
                placeholderTextColor={colors.owl400}
                multiline
              />
            </View>

            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-base text-owl-500 mt-4 mb-3">
              💡 Quick ideas
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {topicSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.label}
                  onPress={() => setTopic(suggestion.topic)}
                  activeOpacity={0.7}
                  className="flex-row items-center bg-owl-200 rounded-xl px-3 py-2"
                >
                  <Ionicons name={suggestion.icon as any} size={16} color={colors.owl400} />
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-base ml-1.5 text-owl-700">
                    {suggestion.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Language Selection */}
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-3">
              🌍 Target Language
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(languages || [{ code: "Spanish", name: "Spanish" }]).map((lang: any) => {
                  const isSelected = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => setLanguage(lang.code)}
                      activeOpacity={0.7}
                      className={`px-5 py-3 rounded-xl ${
                        isSelected ? "bg-secondary-500" : "bg-owl-200"
                      }`}
                    >
                      <Text style={{ fontFamily: "Nunito_600SemiBold" }} className={`${
                        isSelected ? "text-white" : "text-owl-700"
                      }`}>
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View className="bg-owl-200 rounded-xl p-3 mt-4 flex-row items-center">
              <Ionicons name="library" size={16} color={colors.owl400} />
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-base text-owl-600 ml-2">
                <Text style={{ fontFamily: "Nunito_700Bold" }}>{knownWords}</Text> known words in {language}
              </Text>
            </View>
          </View>

          {/* Difficulty Selection */}
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-3">
              🎯 Difficulty Level
            </Text>
            <View className="flex-row gap-2">
              {difficultyOptions.map((opt) => {
                const isSelected = difficulty === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDifficulty(opt.value)}
                    activeOpacity={0.7}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      isSelected ? opt.bg : "bg-owl-200"
                    }`}
                  >
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-base ${
                      isSelected ? "text-white" : "text-owl-700"
                    }`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Writing Style */}
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-3">
              ✍️ Writing Style
            </Text>
            <View className="flex-row flex-wrap">
              {styleOptions.map((opt) => {
                const isSelected = style === opt.value;
                return (
                  <View className="w-1/2 p-1" key={opt.value}>
                    <TouchableOpacity
                      onPress={() => setStyle(opt.value)}
                      activeOpacity={0.7}
                      className={`px-5 py-3 rounded-xl ${
                        isSelected ? "bg-primary-500" : "bg-owl-200"
                      }`}
                    >
                      <Text style={{ fontFamily: "Nunito_600SemiBold" }} className={`${
                        isSelected ? "text-white" : "text-owl-700"
                      }`}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Advanced Options Toggle */}
          <TouchableOpacity
            onPress={() => setShowAdvanced(!showAdvanced)}
            activeOpacity={0.7}
            className="bg-owl-100 rounded-2xl p-5 mb-5 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Ionicons name="settings-outline" size={20} color={colors.owl400} />
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-700 ml-3">
                ⚙️ Advanced Options
              </Text>
            </View>
            <Ionicons
              name={showAdvanced ? "chevron-up" : "chevron-down"}
              size={24}
              color={colors.owl500}
            />
          </TouchableOpacity>

          {showAdvanced && (
            <View className="bg-owl-100 rounded-2xl p-5 mb-5">
              {/* Word Count */}
              <View className="mb-6">
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-3">
                  Word Count: <Text className="text-secondary-500">{wordCount}</Text>
                </Text>
                <View className="flex-row gap-2">
                  {[100, 150, 200, 300, 400].map((count) => {
                    const isSelected = wordCount === count;
                    return (
                      <TouchableOpacity
                        key={count}
                        onPress={() => setWordCount(count)}
                        activeOpacity={0.7}
                        className={`px-4 py-2.5 rounded-xl ${
                          isSelected ? "bg-secondary-500" : "bg-owl-200"
                        }`}
                      >
                        <Text style={{ fontFamily: "Nunito_600SemiBold" }} className={`${
                          isSelected ? "text-white" : "text-owl-600"
                        }`}>
                          {count}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Known Words Ratio */}
              <View className="mb-6">
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-3">
                  Known Words: <Text className="text-primary-500">{knownWordsRatio}%</Text>
                </Text>
                <View className="flex-row gap-2">
                  {[50, 60, 70, 80, 90].map((ratio) => {
                    const isSelected = knownWordsRatio === ratio;
                    return (
                      <TouchableOpacity
                        key={ratio}
                        onPress={() => setKnownWordsRatio(ratio)}
                        activeOpacity={0.7}
                        className={`flex-1 py-3 rounded-xl items-center ${
                          isSelected ? "bg-primary-500" : "bg-owl-200"
                        }`}
                      >
                        <Text style={{ fontFamily: "Nunito_700Bold" }} className={`${
                          isSelected ? "text-white" : "text-owl-600"
                        }`}>
                          {ratio}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Include toggles */}
              <View className="gap-5">
                <TouchableOpacity
                  onPress={() => setIncludeLearningWords(!includeLearningWords)}
                  className="flex-row items-center"
                >
                  <View
                    className={`w-6 h-6 rounded-lg border-2 mr-3 items-center justify-center ${
                      includeLearningWords
                        ? "bg-primary-500 border-primary-500"
                        : "border-owl-400 bg-owl-200"
                    }`}
                  >
                    {includeLearningWords && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700">
                    Include learning words
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIncludeLearnedWords(!includeLearnedWords)}
                  className="flex-row items-center"
                >
                  <View
                    className={`w-6 h-6 rounded-lg border-2 mr-3 items-center justify-center ${
                      includeLearnedWords
                        ? "bg-primary-500 border-primary-500"
                        : "border-owl-400 bg-owl-200"
                    }`}
                  >
                    {includeLearnedWords && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700">
                    Include learned words
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Generate Button */}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={!topic.trim() || generateMutation.isPending}
            activeOpacity={0.7}
            className={`rounded-2xl py-5 ${
              !topic.trim() || generateMutation.isPending
                ? "bg-owl-200"
                : "bg-primary-500"
            }`}
          >
            {generateMutation.isPending ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator color="white" size="small" />
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-center text-lg ml-2">
                  Crafting... ✨
                </Text>
              </View>
            ) : (
              <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-center text-lg ${
                !topic.trim() ? "text-owl-400" : "text-white"
              }`}>
                Create My Story ✨
              </Text>
            )}
          </TouchableOpacity>

          {generateMutation.isError && (
            <View className="bg-danger-100 rounded-2xl p-5 mt-5 flex-row items-center">
              <Ionicons name="alert-circle" size={20} color="#ff4b4b" />
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-danger-600 ml-3">
                Failed to generate text. Please try again.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
