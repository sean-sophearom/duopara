import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../../src/store/authStore";
import { practiceApi, vocabularyApi } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { GAME_INFO, GameType, VocabularyStatus } from "../../src/types/games";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ViewState = "select" | "config";

export default function PracticeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [viewState, setViewState] = useState<ViewState>("select");
  const [selectedStatuses, setSelectedStatuses] = useState<VocabularyStatus[]>([
    "learning",
    "learned",
  ]);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [wordCount, setWordCount] = useState(5);

  const sourceLanguage = user?.settings?.targetLanguage || "Spanish";

  // Load saved preferences
  useEffect(() => {
    AsyncStorage.getItem("duopara.practice_word_count").then((saved: string | null) => {
      if (saved) setWordCount(parseInt(saved));
    });
    AsyncStorage.getItem("duopara.practice_selected_statuses").then((saved: string | null) => {
      if (saved) setSelectedStatuses(JSON.parse(saved));
    });
  }, []);

  // Save preferences
  useEffect(() => {
    AsyncStorage.setItem("duopara.practice_word_count", wordCount.toString());
  }, [wordCount]);

  useEffect(() => {
    AsyncStorage.setItem(
      "duopara.practice_selected_statuses",
      JSON.stringify(selectedStatuses)
    );
  }, [selectedStatuses]);

  const { data: vocabStats } = useQuery({
    queryKey: ["vocabulary", "stats", sourceLanguage],
    queryFn: () => vocabularyApi.getStats(sourceLanguage).then((r) => r.data),
  });

  const { data: dueData } = useQuery({
    queryKey: ["practice", "due", sourceLanguage],
    queryFn: () => practiceApi.getDueCount(sourceLanguage).then((r) => r.data),
  });

  const availableWordCount = selectedStatuses.reduce((sum, status) => {
    if (!vocabStats) return sum;
    return sum + (vocabStats[status] || 0);
  }, 0);

  const toggleStatus = (status: VocabularyStatus) => {
    if (selectedStatuses.includes(status)) {
      if (selectedStatuses.length > 1) {
        setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
      }
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const handleStartGame = () => {
    if (!selectedGame) return;
    
    const gameInfo = GAME_INFO[selectedGame];
    const config = gameInfo.defaultConfig;
    
    router.push({
      pathname: "/practice/session",
      params: {
        gameType: selectedGame,
        statuses: JSON.stringify(selectedStatuses),
        wordCount: wordCount.toString(),
        config: JSON.stringify(config),
      },
    });
  };

  const gameTypes = Object.values(GAME_INFO);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Due for Review */}
        {(dueData?.dueCount || 0) > 0 && (
          <TouchableOpacity
            className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center">
              <Ionicons name="notifications" size={24} color="#0284c7" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-primary-900">
                {dueData?.dueCount} words due for review!
              </Text>
              <Text className="text-sm text-primary-700">
                Practice now to maintain your progress
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Word Status Filter */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">
            Words to Practice
          </Text>
          <View className="flex-row gap-2">
            {(["learning", "learned", "mastered"] as VocabularyStatus[]).map(
              (status) => {
                const isSelected = selectedStatuses.includes(status);
                const count = vocabStats?.[status] || 0;
                const colors = {
                  learning: isSelected
                    ? "bg-yellow-100 border-yellow-500"
                    : "bg-gray-100 border-gray-200",
                  learned: isSelected
                    ? "bg-blue-100 border-blue-500"
                    : "bg-gray-100 border-gray-200",
                  mastered: isSelected
                    ? "bg-green-100 border-green-500"
                    : "bg-gray-100 border-gray-200",
                };
                const textColors = {
                  learning: isSelected ? "text-yellow-700" : "text-gray-600",
                  learned: isSelected ? "text-blue-700" : "text-gray-600",
                  mastered: isSelected ? "text-green-700" : "text-gray-600",
                };
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => toggleStatus(status)}
                    className={`flex-1 p-3 rounded-lg border ${colors[status]}`}
                  >
                    <Text
                      className={`font-medium text-center capitalize ${textColors[status]}`}
                    >
                      {status}
                    </Text>
                    <Text className="text-center text-sm text-gray-500">
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
          <Text className="text-sm text-gray-500 mt-3 text-center">
            {availableWordCount} words available
          </Text>
        </View>

        {/* Word Count */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">
            Number of Words
          </Text>
          <View className="flex-row gap-2">
            {[3, 5, 10, 15, 20].map((count) => (
              <TouchableOpacity
                key={count}
                onPress={() => setWordCount(count)}
                disabled={count > availableWordCount}
                className={`flex-1 py-3 rounded-lg border ${
                  wordCount === count
                    ? "bg-primary-50 border-primary-500"
                    : count > availableWordCount
                    ? "bg-gray-50 border-gray-100"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    wordCount === count
                      ? "text-primary-700"
                      : count > availableWordCount
                      ? "text-gray-300"
                      : "text-gray-700"
                  }`}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Game Selection */}
        <View className="mb-4">
          <Text className="font-semibold text-gray-900 mb-3 text-lg">
            Choose a Game
          </Text>
          <View className="gap-3">
            {gameTypes.map((game) => {
              const isDisabled = availableWordCount < game.minWords;
              return (
                <TouchableOpacity
                  key={game.type}
                  onPress={() =>
                    !isDisabled && setSelectedGame(game.type)
                  }
                  disabled={isDisabled}
                  className={`bg-white rounded-xl p-4 border ${
                    selectedGame === game.type
                      ? "border-primary-500 bg-primary-50"
                      : isDisabled
                      ? "border-gray-100 bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center">
                    <Text className="text-2xl mr-3">{game.icon}</Text>
                    <View className="flex-1">
                      <Text
                        className={`font-semibold ${
                          isDisabled ? "text-gray-400" : "text-gray-900"
                        }`}
                      >
                        {game.name}
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDisabled ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        {game.description}
                      </Text>
                    </View>
                    {selectedGame === game.type && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#0284c7"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          onPress={handleStartGame}
          disabled={!selectedGame || availableWordCount === 0}
          className={`py-4 rounded-xl items-center mb-6 ${
            !selectedGame || availableWordCount === 0
              ? "bg-primary-300"
              : "bg-primary-600"
          }`}
        >
          <View className="flex-row items-center">
            <Ionicons name="play" size={20} color="white" />
            <Text className="text-white font-semibold text-lg ml-2">
              Start Practice
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
