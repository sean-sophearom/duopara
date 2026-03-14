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
        <View className="px-6 pt-6 pb-8">
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-lg">
            {getGreeting()}
          </Text>
          <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-owl-900 text-3xl mt-1">
            {user?.name || "Learner"}
          </Text>
        </View>

        {/* Streak + Progress */}
        <View className="px-6 flex-row gap-4">
          <View className="bg-owl-100 rounded-2xl p-5 flex-1 items-center">
            <Text className="text-3xl mb-1">🔥</Text>
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-owl-900">
              {stats?.activity?.currentStreak || 0}
            </Text>
            <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm">
              day streak
            </Text>
          </View>
          <View className="bg-owl-100 rounded-2xl p-5 flex-1">
            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-500 text-sm mb-2">
              {language}
            </Text>
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-900 text-lg">
              {masteredWords}/{totalWords}
            </Text>
            <View className="h-2 bg-owl-200 rounded-full overflow-hidden mt-2">
              <View
                className="h-full bg-primary-500 rounded-full"
                style={{ width: `${masteryProgress}%` }}
              />
            </View>
          </View>
        </View>

        {/* Due for Review */}
        {(dueData?.dueCount || 0) > 0 && (
          <View className="px-6 mt-5">
            <Link href="/(tabs)/practice" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <View className="bg-secondary-100 rounded-2xl p-5 flex-row items-center">
                  <Ionicons name="notifications" size={22} color="#1cb0f6" />
                  <View className="flex-1 ml-4">
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-secondary-600 text-base">
                      {dueData?.dueCount} words ready for review
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#1cb0f6" />
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {/* Stats */}
        <View className="px-6 mt-8">
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-xl text-owl-800 mb-4">
            Your Stats
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <StatItem icon="checkmark-circle" iconColor="#58cc02" value={vocabStats?.mastered || 0} label="Mastered" />
            <StatItem icon="book" iconColor="#1cb0f6" value={stats?.reading?.completedSessions || 0} label="Texts Read" />
            <StatItem icon="school" iconColor="#ffc800" value={vocabStats?.learning || 0} label="Learning" />
            <StatItem icon="library" iconColor="#ff4b4b" value={totalWords} label="Total Words" />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mt-8">
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-xl text-owl-800 mb-4">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            <Link href="/(tabs)/generate" asChild>
              <TouchableOpacity activeOpacity={0.7} className="flex-1">
                <View className="bg-primary-500 rounded-2xl p-5 items-center">
                  <Ionicons name="add" size={28} color="#ffffff" />
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-base mt-2">
                    Create Text
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
            <Link href="/(tabs)/practice" asChild>
              <TouchableOpacity activeOpacity={0.7} className="flex-1">
                <View className="bg-secondary-500 rounded-2xl p-5 items-center">
                  <Ionicons name="school" size={28} color="#ffffff" />
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-base mt-2">
                    Practice
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Recent Texts */}
        {recentTexts?.texts && recentTexts.texts.length > 0 && (
          <View className="px-6 mt-8 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-xl text-owl-800">
                Continue Reading
              </Text>
              <Link href="/(tabs)/history" asChild>
                <TouchableOpacity className="flex-row items-center">
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-primary-500 mr-1">
                    See all
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#58cc02" />
                </TouchableOpacity>
              </Link>
            </View>
            {recentTexts.texts.map((text: any) => (
              <Link key={text.id} href={`/read/${text.id}`} asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <View className="bg-owl-100 rounded-2xl p-5 mb-3 flex-row items-center">
                    <View className="w-10 h-10 rounded-xl bg-primary-100 items-center justify-center mr-4">
                      <Ionicons name="document-text" size={20} color="#58cc02" />
                    </View>
                    <View className="flex-1">
                      <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-base" numberOfLines={1}>
                        {text.title || text.topic}
                      </Text>
                      <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm mt-1">
                        {text.language} · {text.wordCount} words
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#555555" />
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

function StatItem({ icon, iconColor, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: number;
  label: string;
}) {
  return (
    <View className="bg-owl-100 rounded-2xl p-5 flex-1 min-w-[45%]">
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-owl-900 mt-2">
        {value}
      </Text>
      <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm">
        {label}
      </Text>
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
