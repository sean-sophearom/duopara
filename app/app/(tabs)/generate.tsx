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

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

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
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-5">
          {/* Header */}
          <Text className="text-owl-500 text-base">Create</Text>
          <Text className="text-owl-800 text-2xl font-bold mt-1 mb-4">Reading Material</Text>

          {/* Topic Input Card */}
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <Text className="font-bold text-owl-800 mb-3">What do you want to read?</Text>
            
            <View className="bg-owl-100 rounded-xl px-4 py-3 flex-row items-start">
              <Ionicons name="bulb" size={20} color="#ffc800" style={{ marginTop: 2 }} />
              <TextInput
                value={topic}
                onChangeText={setTopic}
                placeholder="e.g. A day at the beach with friends..."
                className="flex-1 ml-3 text-owl-800 text-base"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                style={{ minHeight: 50 }}
              />
            </View>

            {/* Topic Suggestions */}
            <Text className="text-sm text-owl-500 mt-4 mb-2 font-medium">Quick ideas:</Text>
            <View className="flex-row flex-wrap gap-2">
              {topicSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.label}
                  onPress={() => setTopic(suggestion.topic)}
                  activeOpacity={0.7}
                  className="flex-row items-center bg-secondary-100 rounded-xl px-3 py-2"
                >
                  <Ionicons name={suggestion.icon as any} size={16} color="#1cb0f6" />
                  <Text className="text-sm font-medium ml-1.5 text-secondary-700">
                    {suggestion.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Language Selection */}
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <Text className="font-bold text-owl-800 mb-3">Target Language</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(languages || [{ code: "Spanish", name: "Spanish" }]).map((lang: any) => {
                  const isSelected = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => setLanguage(lang.code)}
                      activeOpacity={0.8}
                      className={`px-4 py-2.5 rounded-xl ${
                        isSelected ? "bg-secondary-500" : "bg-owl-100"
                      }`}
                    >
                      <Text className={`font-medium ${
                        isSelected ? "text-white" : "text-owl-700"
                      }`}>
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View className="bg-secondary-100 rounded-xl p-3 mt-3 flex-row items-center">
              <Ionicons name="library" size={18} color="#1cb0f6" />
              <Text className="text-sm text-secondary-700 ml-2">
                <Text className="font-bold">{knownWords}</Text> known words in {language}
              </Text>
            </View>
          </View>

          {/* Difficulty Selection */}
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <Text className="font-bold text-owl-800 mb-3">Difficulty Level</Text>
            <View className="flex-row gap-2">
              {difficultyOptions.map((opt) => {
                const isSelected = difficulty === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDifficulty(opt.value)}
                    activeOpacity={0.8}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      isSelected ? opt.bg : "bg-owl-100"
                    }`}
                  >
                    <Text className={`font-bold text-sm ${
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
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <Text className="font-bold text-owl-800 mb-3">Writing Style</Text>
            <View className="flex-row flex-wrap gap-2">
              {styleOptions.map((opt) => {
                const isSelected = style === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setStyle(opt.value)}
                    activeOpacity={0.8}
                    className={`px-4 py-2.5 rounded-xl ${
                      isSelected ? "bg-primary-500" : "bg-owl-100"
                    }`}
                  >
                    <Text className={`font-medium ${
                      isSelected ? "text-white" : "text-owl-700"
                    }`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Advanced Options Toggle */}
          <TouchableOpacity
            onPress={() => setShowAdvanced(!showAdvanced)}
            activeOpacity={0.8}
            className="bg-white rounded-xl p-4 mb-4 flex-row items-center justify-between"
            style={cardShadow}
          >
            <View className="flex-row items-center">
              <Ionicons name="settings-outline" size={20} color="#777" />
              <Text className="font-bold text-owl-700 ml-3">Advanced Options</Text>
            </View>
            <Ionicons
              name={showAdvanced ? "chevron-up" : "chevron-down"}
              size={24}
              color="#777"
            />
          </TouchableOpacity>

          {showAdvanced && (
            <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
              {/* Word Count */}
              <View className="mb-5">
                <Text className="font-bold text-owl-800 mb-3">
                  Word Count: <Text className="text-secondary-600">{wordCount}</Text>
                </Text>
                <View className="flex-row gap-2">
                  {[100, 150, 200, 300, 400].map((count) => {
                    const isSelected = wordCount === count;
                    return (
                      <TouchableOpacity
                        key={count}
                        onPress={() => setWordCount(count)}
                        activeOpacity={0.8}
                        className={`px-3 py-2 rounded-xl ${
                          isSelected ? "bg-secondary-500" : "bg-owl-100"
                        }`}
                      >
                        <Text className={`font-medium ${
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
              <View className="mb-5">
                <Text className="font-bold text-owl-800 mb-3">
                  Known Words: <Text className="text-primary-600">{knownWordsRatio}%</Text>
                </Text>
                <View className="flex-row gap-2">
                  {[50, 60, 70, 80, 90].map((ratio) => {
                    const isSelected = knownWordsRatio === ratio;
                    return (
                      <TouchableOpacity
                        key={ratio}
                        onPress={() => setKnownWordsRatio(ratio)}
                        activeOpacity={0.8}
                        className={`flex-1 py-2.5 rounded-xl items-center ${
                          isSelected ? "bg-primary-500" : "bg-owl-100"
                        }`}
                      >
                        <Text className={`font-bold ${
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
              <View className="gap-4">
                <TouchableOpacity
                  onPress={() => setIncludeLearningWords(!includeLearningWords)}
                  className="flex-row items-center"
                >
                  <View
                    className={`w-6 h-6 rounded-lg border-2 mr-3 items-center justify-center ${
                      includeLearningWords
                        ? "bg-primary-500 border-primary-500"
                        : "border-owl-300 bg-white"
                    }`}
                  >
                    {includeLearningWords && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text className="text-owl-700 font-medium">Include learning words</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIncludeLearnedWords(!includeLearnedWords)}
                  className="flex-row items-center"
                >
                  <View
                    className={`w-6 h-6 rounded-lg border-2 mr-3 items-center justify-center ${
                      includeLearnedWords
                        ? "bg-primary-500 border-primary-500"
                        : "border-owl-300 bg-white"
                    }`}
                  >
                    {includeLearnedWords && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text className="text-owl-700 font-medium">Include learned words</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Generate Button */}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={!topic.trim() || generateMutation.isPending}
            activeOpacity={0.8}
            className={`rounded-xl py-4 border-b-4 ${
              !topic.trim() || generateMutation.isPending
                ? "bg-owl-200 border-owl-300"
                : "bg-primary-500 border-primary-700"
            }`}
          >
            {generateMutation.isPending ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white text-center font-bold text-lg ml-2">
                  Creating...
                </Text>
              </View>
            ) : (
              <Text className={`text-center font-bold text-lg ${
                !topic.trim() ? "text-owl-400" : "text-white"
              }`}>
                Generate Reading Material
              </Text>
            )}
          </TouchableOpacity>

          {generateMutation.isError && (
            <View className="bg-danger-100 border-l-4 border-danger-500 rounded-xl p-4 mt-4 flex-row items-center">
              <Ionicons name="alert-circle" size={20} color="#ff4b4b" />
              <Text className="text-danger-700 ml-2">
                Failed to generate text. Please try again.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
