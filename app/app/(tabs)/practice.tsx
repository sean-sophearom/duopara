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

  useEffect(() => {
    AsyncStorage.getItem("duopara.practice_word_count").then((saved: string | null) => {
      if (saved) setWordCount(parseInt(saved));
    });
    AsyncStorage.getItem("duopara.practice_selected_statuses").then((saved: string | null) => {
      if (saved) setSelectedStatuses(JSON.parse(saved));
    });
  }, []);

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
    learning: { color: "bg-warning-500" },
    learned: { color: "bg-secondary-500" },
    mastered: { color: "bg-primary-500" },
  };

  return (
    <SafeAreaView className="flex-1 bg-owl-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-6">
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-lg">Practice your</Text>
          <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-owl-900 text-3xl mt-1">{sourceLanguage} Skills</Text>
          
          {/* Stats Row */}
          <View className="flex-row gap-3 mt-5">
            <View className="flex-1 bg-owl-100 rounded-2xl p-4 items-center">
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-warning-500 text-xl">{vocabStats?.learning || 0}</Text>
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-xs mt-1">Learning</Text>
            </View>
            <View className="flex-1 bg-owl-100 rounded-2xl p-4 items-center">
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-secondary-500 text-xl">{vocabStats?.learned || 0}</Text>
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-xs mt-1">Learned</Text>
            </View>
            <View className="flex-1 bg-owl-100 rounded-2xl p-4 items-center">
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-primary-500 text-xl">{vocabStats?.mastered || 0}</Text>
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-xs mt-1">Mastered</Text>
            </View>
          </View>
        </View>

        <View className="px-6">
          {/* Due for Review */}
          {(dueData?.dueCount || 0) > 0 && (
            <View className="bg-danger-100 rounded-2xl p-5 flex-row items-center mb-6">
              <Ionicons name="notifications" size={22} color="#ff4b4b" />
              <View className="flex-1 ml-4">
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-danger-600 text-base">
                  {dueData?.dueCount} words due!
                </Text>
                <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-danger-600 text-sm mt-0.5">
                  Time for your daily review
                </Text>
              </View>
            </View>
          )}

          {/* Word Status Filter */}
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-lg text-owl-800 mb-4">Words to Practice</Text>

            <View className="flex-row gap-2">
              {(["learning", "learned", "mastered"] as VocabularyStatus[]).map((status) => {
                const isSelected = selectedStatuses.includes(status);
                const config = statusConfig[status];
                const count = vocabStats?.[status] || 0;
                
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => toggleStatus(status)}
                    activeOpacity={0.7}
                    className={`flex-1 p-3 rounded-xl items-center ${
                      isSelected ? config.color : "bg-owl-200"
                    }`}
                  >
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-sm capitalize ${
                      isSelected ? "text-white" : "text-owl-600"
                    }`}>
                      {status}
                    </Text>
                    <Text style={{ fontFamily: "Nunito_400Regular" }} className={`text-xs ${
                      isSelected ? "text-white/80" : "text-owl-400"
                    }`}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="bg-owl-200 rounded-xl p-3 mt-4 flex-row items-center justify-center">
              <Ionicons name="library" size={16} color="#58cc02" />
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-600 ml-2 text-sm">
                {availableWordCount} words available
              </Text>
            </View>
          </View>

          {/* Word Count */}
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-lg text-owl-800 mb-4">Number of Words</Text>

            <View className="flex-row gap-2">
              {[3, 5, 10, 15, 20].map((count) => {
                const isDisabled = count > availableWordCount;
                const isSelected = wordCount === count;
                
                return (
                  <TouchableOpacity
                    key={count}
                    onPress={() => !isDisabled && setWordCount(count)}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      isSelected
                        ? "bg-secondary-500"
                        : isDisabled
                        ? "bg-owl-200"
                        : "bg-owl-200"
                    }`}
                  >
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-lg ${
                      isSelected ? "text-white" : isDisabled ? "text-owl-400" : "text-owl-700"
                    }`}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Game Selection */}
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-lg text-owl-800 mb-4">Choose a Game</Text>

          <View className="gap-3">
            {gameTypes.map((game) => {
              const isDisabled = availableWordCount < game.minWords;
              const isSelected = selectedGame === game.type;
              
              return (
                <TouchableOpacity
                  key={game.type}
                  onPress={() => !isDisabled && setSelectedGame(game.type)}
                  disabled={isDisabled}
                  activeOpacity={0.7}
                >
                  <View
                    className={`rounded-2xl p-5 flex-row items-center ${
                      isSelected
                        ? "bg-primary-500"
                        : isDisabled
                        ? "bg-owl-200"
                        : "bg-owl-100"
                    }`}
                  >
                    <View className={`w-12 h-12 rounded-xl items-center justify-center ${
                      isSelected ? "bg-primary-400" : "bg-owl-200"
                    }`}>
                      <Text className="text-xl">{game.icon}</Text>
                    </View>
                    <View className="flex-1 ml-4">
                      <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-base ${
                        isSelected ? "text-white" : isDisabled ? "text-owl-400" : "text-owl-800"
                      }`}>
                        {game.name}
                      </Text>
                      <Text style={{ fontFamily: "Nunito_400Regular" }} className={`text-sm mt-0.5 ${
                        isSelected ? "text-white/80" : isDisabled ? "text-owl-400" : "text-owl-500"
                      }`}>
                        {game.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
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
            activeOpacity={0.7}
            className={`mt-6 mb-4 rounded-2xl py-5 ${
              !selectedGame || availableWordCount === 0
                ? "bg-owl-200"
                : "bg-primary-500"
            }`}
          >
            <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-center text-lg ${
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
