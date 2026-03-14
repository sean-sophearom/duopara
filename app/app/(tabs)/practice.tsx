import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../src/store/authStore";
import { practiceApi, vocabularyApi } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { GAME_INFO, GameType, VocabularyStatus } from "../../src/types/games";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

type ViewState = "select" | "config";

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

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

  const statusConfig = {
    learning: { color: "bg-warning-500", lightBg: "bg-warning-100", textColor: "text-warning-700" },
    learned: { color: "bg-secondary-500", lightBg: "bg-secondary-100", textColor: "text-secondary-700" },
    mastered: { color: "bg-primary-500", lightBg: "bg-primary-100", textColor: "text-primary-700" },
  };

  return (
    <SafeAreaView className="flex-1 bg-owl-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-owl-500 text-base">Practice your</Text>
          <Text className="text-owl-800 text-2xl font-bold mt-1">{sourceLanguage} Skills</Text>
          
          {/* Stats Row */}
          <View className="flex-row gap-3 mt-4">
            <View className="flex-1 bg-white rounded-xl p-3 items-center" style={cardShadow}>
              <Text className="text-warning-500 font-bold text-xl">{vocabStats?.learning || 0}</Text>
              <Text className="text-owl-500 text-xs">Learning</Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 items-center" style={cardShadow}>
              <Text className="text-secondary-500 font-bold text-xl">{vocabStats?.learned || 0}</Text>
              <Text className="text-owl-500 text-xs">Learned</Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 items-center" style={cardShadow}>
              <Text className="text-primary-500 font-bold text-xl">{vocabStats?.mastered || 0}</Text>
              <Text className="text-owl-500 text-xs">Mastered</Text>
            </View>
          </View>
        </View>

        <View className="px-5">
          {/* Due for Review */}
          {(dueData?.dueCount || 0) > 0 && (
            <View className="bg-danger-100 rounded-xl p-4 flex-row items-center mb-5 border-l-4 border-danger-500">
              <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                <Ionicons name="notifications" size={20} color="#ff4b4b" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-danger-800">
                  {dueData?.dueCount} words due!
                </Text>
                <Text className="text-danger-600 text-sm">
                  Time for your daily review
                </Text>
              </View>
            </View>
          )}

          {/* Word Status Filter */}
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <Text className="text-lg font-bold text-owl-800 mb-3">Words to Practice</Text>

            <View className="flex-row gap-2">
              {(["learning", "learned", "mastered"] as VocabularyStatus[]).map((status) => {
                const isSelected = selectedStatuses.includes(status);
                const config = statusConfig[status];
                const count = vocabStats?.[status] || 0;
                
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => toggleStatus(status)}
                    activeOpacity={0.8}
                    className={`flex-1 p-3 rounded-xl items-center ${
                      isSelected ? config.color : "bg-owl-100"
                    }`}
                  >
                    <Text className={`font-bold text-sm capitalize ${
                      isSelected ? "text-white" : "text-owl-600"
                    }`}>
                      {status}
                    </Text>
                    <Text className={`text-xs ${
                      isSelected ? "text-white/80" : "text-owl-400"
                    }`}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="bg-primary-100 rounded-lg p-3 mt-4 flex-row items-center justify-center">
              <Ionicons name="library" size={16} color="#58cc02" />
              <Text className="text-primary-700 font-medium ml-2">
                {availableWordCount} words available
              </Text>
            </View>
          </View>

          {/* Word Count */}
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <Text className="text-lg font-bold text-owl-800 mb-3">Number of Words</Text>

            <View className="flex-row gap-2">
              {[3, 5, 10, 15, 20].map((count) => {
                const isDisabled = count > availableWordCount;
                const isSelected = wordCount === count;
                
                return (
                  <TouchableOpacity
                    key={count}
                    onPress={() => !isDisabled && setWordCount(count)}
                    disabled={isDisabled}
                    activeOpacity={0.8}
                    className={`flex-1 py-3 rounded-xl items-center border-2 ${
                      isSelected
                        ? "bg-secondary-500 border-secondary-500"
                        : isDisabled
                        ? "bg-owl-50 border-owl-100"
                        : "bg-white border-owl-200"
                    }`}
                  >
                    <Text className={`font-bold text-lg ${
                      isSelected ? "text-white" : isDisabled ? "text-owl-300" : "text-owl-700"
                    }`}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Game Selection */}
          <Text className="text-lg font-bold text-owl-800 mb-3">Choose a Game</Text>

          <View className="gap-3">
            {gameTypes.map((game) => {
              const isDisabled = availableWordCount < game.minWords;
              const isSelected = selectedGame === game.type;
              
              return (
                <TouchableOpacity
                  key={game.type}
                  onPress={() => !isDisabled && setSelectedGame(game.type)}
                  disabled={isDisabled}
                  activeOpacity={0.8}
                >
                  <View
                    className={`rounded-xl p-4 flex-row items-center ${
                      isSelected
                        ? "bg-primary-500 border-b-4 border-primary-700"
                        : isDisabled
                        ? "bg-owl-100"
                        : "bg-white"
                    }`}
                    style={isSelected ? undefined : cardShadow}
                  >
                    <View className={`w-12 h-12 rounded-xl items-center justify-center ${
                      isSelected ? "bg-primary-400" : "bg-owl-100"
                    }`}>
                      <Text className="text-xl">{game.icon}</Text>
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className={`font-bold ${
                        isSelected ? "text-white" : isDisabled ? "text-owl-400" : "text-owl-800"
                      }`}>
                        {game.name}
                      </Text>
                      <Text className={`text-sm ${
                        isSelected ? "text-white/80" : isDisabled ? "text-owl-300" : "text-owl-500"
                      }`}>
                        {game.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="w-8 h-8 rounded-full bg-white items-center justify-center">
                        <Ionicons name="checkmark" size={20} color="#58cc02" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Start Button */}
          <TouchableOpacity
            onPress={handleStartGame}
            disabled={!selectedGame || availableWordCount === 0}
            activeOpacity={0.8}
            className={`mt-6 mb-4 rounded-xl py-4 border-b-4 ${
              !selectedGame || availableWordCount === 0
                ? "bg-owl-200 border-owl-300"
                : "bg-primary-500 border-primary-700"
            }`}
          >
            <Text className={`text-center font-bold text-lg ${
              !selectedGame || availableWordCount === 0 ? "text-owl-400" : "text-white"
            }`}>
              Start Practice
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
