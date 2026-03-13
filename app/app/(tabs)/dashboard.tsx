import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { statsApi, textsApi, vocabularyApi, practiceApi } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";

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

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Welcome back{user?.name ? `, ${user.name}` : ""}!
          </Text>
          <Text className="text-gray-600 mt-1">
            Continue your {language} learning journey
          </Text>
        </View>

        {/* Quick stats */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%] border border-gray-200">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-lg bg-orange-100 items-center justify-center">
                <Ionicons name="flame" size={20} color="#ea580c" />
              </View>
              <Text className="text-sm text-gray-600 ml-3">Streak</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">
              {stats?.activity?.currentStreak || 0}
              <Text className="text-base font-normal text-gray-500"> days</Text>
            </Text>
          </View>

          <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%] border border-gray-200">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-lg bg-green-100 items-center justify-center">
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              </View>
              <Text className="text-sm text-gray-600 ml-3">Mastered</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">
              {vocabStats?.mastered || 0}
              <Text className="text-base font-normal text-gray-500"> words</Text>
            </Text>
          </View>

          <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%] border border-gray-200">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-lg bg-primary-100 items-center justify-center">
                <Ionicons name="book" size={20} color="#0284c7" />
              </View>
              <Text className="text-sm text-gray-600 ml-3">Texts Read</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">
              {stats?.reading?.completedSessions || 0}
            </Text>
          </View>

          <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%] border border-gray-200">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-lg bg-purple-100 items-center justify-center">
                <Ionicons name="library" size={20} color="#9333ea" />
              </View>
              <Text className="text-sm text-gray-600 ml-3">Vocabulary</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">
              {vocabStats?.total || 0}
              <Text className="text-base font-normal text-gray-500"> words</Text>
            </Text>
          </View>
        </View>

        {/* Due for Review */}
        {(dueData?.dueCount || 0) > 0 && (
          <Link href="/(tabs)/practice" asChild>
            <TouchableOpacity className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-primary-100 items-center justify-center">
                  <Ionicons name="school" size={20} color="#0284c7" />
                </View>
                <View className="ml-3">
                  <Text className="font-semibold text-primary-900">
                    {dueData?.dueCount} words due for review
                  </Text>
                  <Text className="text-sm text-primary-700">
                    Tap to start practicing
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#0284c7" />
            </TouchableOpacity>
          </Link>
        )}

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            <Link href="/(tabs)/generate" asChild>
              <TouchableOpacity className="flex-1 bg-primary-600 rounded-xl p-4 items-center">
                <Ionicons name="sparkles" size={24} color="white" />
                <Text className="text-white font-medium mt-2">Generate Text</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/(tabs)/practice" asChild>
              <TouchableOpacity className="flex-1 bg-green-600 rounded-xl p-4 items-center">
                <Ionicons name="school" size={24} color="white" />
                <Text className="text-white font-medium mt-2">Practice</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Recent Texts */}
        {recentTexts?.texts && recentTexts.texts.length > 0 && (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-gray-900">
                Recent Texts
              </Text>
              <Link href="/(tabs)/history" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-medium">See all</Text>
                </TouchableOpacity>
              </Link>
            </View>
            {recentTexts.texts.map((text: any) => (
              <Link key={text.id} href={`/read/${text.id}`} asChild>
                <TouchableOpacity className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
                  <Text className="font-medium text-gray-900" numberOfLines={1}>
                    {text.title || text.topic}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <View className="bg-primary-100 px-2 py-1 rounded">
                      <Text className="text-xs text-primary-700">
                        {text.language}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-sm ml-2">
                      {text.wordCount} words
                    </Text>
                    <Text className="text-gray-400 text-sm ml-2">
                      {new Date(text.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
