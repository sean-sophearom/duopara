import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { statsApi, textsApi, vocabularyApi, practiceApi } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const language = user?.settings?.targetLanguage || "Spanish";
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["stats", language],
    queryFn: () => statsApi.get(language).then((r) => r.data),
  });

  const { data: recentTexts, refetch: refetchTexts } = useQuery({
    queryKey: ["texts", "recent"],
    queryFn: () => textsApi.getAll({ limit: 3 }).then((r) => r.data),
  });

  const { data: vocabStats, refetch: refetchVocab } = useQuery({
    queryKey: ["vocabulary", "stats", language],
    queryFn: () => vocabularyApi.getStats(language).then((r) => r.data),
  });

  const { data: dueData, refetch: refetchDue } = useQuery({
    queryKey: ["practice", "due", language],
    queryFn: () => practiceApi.getDueCount(language).then((r) => r.data),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTexts(), refetchVocab(), refetchDue()]);
    setRefreshing(false);
  }, []);

  const totalWords = vocabStats?.total || 0;
  const masteredWords = vocabStats?.mastered || 0;
  const masteryProgress = totalWords > 0 ? (masteredWords / totalWords) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-owl-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#58cc02" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-owl-500 text-base">{getGreeting()}</Text>
          <Text className="text-owl-800 text-2xl font-bold mt-1">
            {user?.name || "Learner"}
          </Text>
        </View>

        {/* Streak Card */}
        <View className="px-5">
          <View className="bg-white rounded-xl p-4 flex-row items-center" style={cardShadow}>
            <View className="w-14 h-14 rounded-full bg-warning-100 items-center justify-center mr-4">
              <Text className="text-2xl">🔥</Text>
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-owl-800">
                {stats?.activity?.currentStreak || 0} day streak
              </Text>
              <Text className="text-owl-500">Keep it going!</Text>
            </View>
          </View>
        </View>

        {/* Progress Card */}
        <View className="px-5 mt-4">
          <View className="bg-white rounded-xl p-4" style={cardShadow}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-owl-800 font-bold">{language} Progress</Text>
              <Text className="text-owl-500 text-sm">{masteredWords}/{totalWords} words</Text>
            </View>
            <View className="h-3 bg-owl-100 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary-500 rounded-full"
                style={{ width: `${masteryProgress}%` }}
              />
            </View>
          </View>
        </View>

        {/* Due for Review */}
        {(dueData?.dueCount || 0) > 0 && (
          <View className="px-5 mt-4">
            <Link href="/(tabs)/practice" asChild>
              <TouchableOpacity activeOpacity={0.8}>
                <View className="bg-secondary-100 rounded-xl p-4 flex-row items-center border-l-4 border-secondary-500">
                  <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                    <Ionicons name="notifications" size={20} color="#1cb0f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-secondary-800 font-bold">
                      {dueData?.dueCount} words ready for review
                    </Text>
                    <Text className="text-secondary-600 text-sm">Practice now!</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#1cb0f6" />
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {/* Stats Grid */}
        <View className="px-5 mt-6">
          <Text className="text-lg font-bold text-owl-800 mb-3">Your Stats</Text>
          <View className="flex-row flex-wrap gap-3">
            <StatItem
              icon="checkmark-circle"
              iconColor="#58cc02"
              iconBg="bg-primary-100"
              value={vocabStats?.mastered || 0}
              label="Mastered"
            />
            <StatItem
              icon="book"
              iconColor="#1cb0f6"
              iconBg="bg-secondary-100"
              value={stats?.reading?.completedSessions || 0}
              label="Texts Read"
            />
            <StatItem
              icon="school"
              iconColor="#ffc800"
              iconBg="bg-warning-100"
              value={vocabStats?.learning || 0}
              label="Learning"
            />
            <StatItem
              icon="library"
              iconColor="#ff4b4b"
              iconBg="bg-danger-100"
              value={totalWords}
              label="Total Words"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-5 mt-6">
          <Text className="text-lg font-bold text-owl-800 mb-3">Quick Actions</Text>
          <View className="flex-row gap-3">
            <Link href="/(tabs)/generate" asChild>
              <TouchableOpacity activeOpacity={0.8} className="flex-1">
                <View className="bg-primary-500 rounded-xl p-4 items-center border-b-4 border-primary-700">
                  <View className="w-12 h-12 rounded-xl bg-primary-400 items-center justify-center mb-2">
                    <Ionicons name="add" size={28} color="#ffffff" />
                  </View>
                  <Text className="text-white font-bold">Create Text</Text>
                </View>
              </TouchableOpacity>
            </Link>
            <Link href="/(tabs)/practice" asChild>
              <TouchableOpacity activeOpacity={0.8} className="flex-1">
                <View className="bg-secondary-500 rounded-xl p-4 items-center border-b-4 border-secondary-700">
                  <View className="w-12 h-12 rounded-xl bg-secondary-400 items-center justify-center mb-2">
                    <Ionicons name="school" size={28} color="#ffffff" />
                  </View>
                  <Text className="text-white font-bold">Practice</Text>
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Recent Texts */}
        {recentTexts?.texts && recentTexts.texts.length > 0 && (
          <View className="px-5 mt-6 mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-owl-800">Continue Reading</Text>
              <Link href="/(tabs)/history" asChild>
                <TouchableOpacity className="flex-row items-center">
                  <Text className="text-primary-500 font-bold mr-1">See all</Text>
                  <Ionicons name="chevron-forward" size={16} color="#58cc02" />
                </TouchableOpacity>
              </Link>
            </View>
            {recentTexts.texts.map((text: any) => (
              <Link key={text.id} href={`/read/${text.id}`} asChild>
                <TouchableOpacity activeOpacity={0.8}>
                  <View className="bg-white rounded-xl p-4 mb-3 flex-row items-center" style={cardShadow}>
                    <View className="w-10 h-10 rounded-lg bg-primary-100 items-center justify-center mr-3">
                      <Ionicons name="document-text" size={20} color="#58cc02" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-owl-800" numberOfLines={1}>
                        {text.title || text.topic}
                      </Text>
                      <Text className="text-owl-500 text-sm">
                        {text.language} • {text.wordCount} words
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#afafaf" />
                  </View>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ icon, iconColor, iconBg, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  value: number;
  label: string;
}) {
  return (
    <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%]" style={cardShadow}>
      <View className={`w-10 h-10 rounded-lg ${iconBg} items-center justify-center mb-2`}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text className="text-2xl font-bold text-owl-800">{value}</Text>
      <Text className="text-owl-500 text-sm">{label}</Text>
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};
