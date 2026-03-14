import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { statsApi, textsApi, vocabularyApi, practiceApi } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

function getLevel(mastered: number): { level: number; title: string; emoji: string; next: number; current: number } {
  const levels = [
    { min: 0, title: "Newcomer", emoji: "🥚" },
    { min: 10, title: "Explorer", emoji: "🐣" },
    { min: 25, title: "Apprentice", emoji: "🌱" },
    { min: 50, title: "Scholar", emoji: "📚" },
    { min: 100, title: "Wordsmith", emoji: "✨" },
    { min: 200, title: "Linguist", emoji: "🎓" },
    { min: 350, title: "Polyglot", emoji: "🌟" },
    { min: 500, title: "Master", emoji: "👑" },
    { min: 1000, title: "Legend", emoji: "🏆" },
  ];
  let lvl = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (mastered >= levels[i].min) { lvl = i; break; }
  }
  const next = lvl < levels.length - 1 ? levels[lvl + 1].min : levels[lvl].min;
  return { level: lvl + 1, title: levels[lvl].title, emoji: levels[lvl].emoji, next, current: levels[lvl].min };
}

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
  const learningWords = vocabStats?.learning || 0;
  const masteryProgress = totalWords > 0 ? (masteredWords / totalWords) * 100 : 0;
  const level = getLevel(masteredWords);
  const levelProgress = level.next > level.current
    ? ((masteredWords - level.current) / (level.next - level.current)) * 100
    : 100;
  const xp = masteredWords * 10 + (stats?.reading?.completedSessions || 0) * 25 + (stats?.activity?.currentStreak || 0) * 5;

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
        <View className="px-6 pt-6 pb-4">
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-xl">
            {getGreeting()} 👋
          </Text>
          <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-owl-900 text-4xl mt-1">
            {user?.name || "Learner"}
          </Text>
        </View>

        {/* Level + XP + Streak Row */}
        <View className="px-6 flex-row gap-3">
          {/* Level Card */}
          <View className="bg-owl-100 rounded-2xl p-4 flex-1">
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-2">{level.emoji}</Text>
              <View>
                <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-owl-900 text-lg">
                  Lvl {level.level}
                </Text>
                <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-500 text-sm">
                  {level.title}
                </Text>
              </View>
            </View>
            <View className="h-2.5 bg-owl-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-warning-500 rounded-full"
                style={{ width: `${Math.min(levelProgress, 100)}%` }}
              />
            </View>
          </View>

          {/* Streak Card */}
          <View className="bg-owl-100 rounded-2xl p-4 items-center justify-center" style={{ minWidth: 90 }}>
            <Text className="text-3xl mb-0.5">🔥</Text>
            <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-2xl text-owl-900">
              {stats?.activity?.currentStreak || 0}
            </Text>
            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-500 text-sm">
              streak
            </Text>
          </View>
        </View>

        {/* XP Banner */}
        <View className="px-6 mt-3">
          <View className="bg-warning-100 rounded-2xl px-5 py-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-xl mr-2">⭐</Text>
              <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-warning-500 text-xl">
                {xp.toLocaleString()} XP
              </Text>
            </View>
            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-warning-500 text-base">
              {language}
            </Text>
          </View>
        </View>

        {/* Due for Review - Quest Style */}
        {(dueData?.dueCount || 0) > 0 && (
          <View className="px-6 mt-5">
            <Link href="/(tabs)/practice" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <View className="bg-secondary-100 rounded-2xl p-5 flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-secondary-200 items-center justify-center mr-4">
                    <Text className="text-2xl">⚔️</Text>
                  </View>
                  <View className="flex-1">
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-secondary-600 text-lg">
                      Daily Quest
                    </Text>
                    <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-secondary-500 text-base">
                      {dueData?.dueCount} words ready for review
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#1cb0f6" />
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {/* Mastery Progress */}
        <View className="px-6 mt-6">
          <View className="bg-owl-100 rounded-2xl p-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-xl text-owl-800">
                📊 {language} Mastery
              </Text>
              <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-primary-500 text-xl">
                {Math.round(masteryProgress)}%
              </Text>
            </View>
            <View className="h-3 bg-owl-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary-500 rounded-full"
                style={{ width: `${masteryProgress}%` }}
              />
            </View>
            <View className="flex-row justify-between mt-3">
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-500 text-base">
                {masteredWords} mastered
              </Text>
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-500 text-base">
                {learningWords} learning
              </Text>
            </View>
          </View>
        </View>

        {/* Achievement Stats */}
        <View className="px-6 mt-6">
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-owl-800 mb-4">
            🏅 Achievements
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <StatItem emoji="✅" value={vocabStats?.mastered || 0} label="Mastered" bg="bg-primary-100" />
            <StatItem emoji="📖" value={stats?.reading?.completedSessions || 0} label="Texts Read" bg="bg-secondary-100" />
            <StatItem emoji="📝" value={learningWords} label="Learning" bg="bg-warning-100" />
            <StatItem emoji="📚" value={totalWords} label="Total Words" bg="bg-danger-100" />
          </View>
        </View>

        {/* Quick Actions - Quest Board */}
        <View className="px-6 mt-6">
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-owl-800 mb-4">
            🎯 Start a Quest
          </Text>
          <View className="flex-row gap-3">
            <Link href="/(tabs)/generate" asChild>
              <TouchableOpacity activeOpacity={0.7} className="flex-1">
                <View className="bg-primary-500 rounded-2xl p-5 items-center">
                  <Text className="text-3xl mb-2">✨</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-lg">
                    New Story
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
            <Link href="/(tabs)/practice" asChild>
              <TouchableOpacity activeOpacity={0.7} className="flex-1">
                <View className="bg-secondary-500 rounded-2xl p-5 items-center">
                  <Text className="text-3xl mb-2">🏋️</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-lg">
                    Train Words
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Recent Texts */}
        {recentTexts?.texts && recentTexts.texts.length > 0 && (
          <View className="px-6 mt-6 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-owl-800">
                📚 Continue Reading
              </Text>
              <Link href="/(tabs)/history" asChild>
                <TouchableOpacity className="flex-row items-center">
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-primary-500 text-base mr-1">
                    See all
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#58cc02" />
                </TouchableOpacity>
              </Link>
            </View>
            {recentTexts.texts.map((text: any) => (
              <Link key={text.id} href={`/read/${text.id}`} asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <View className="bg-owl-100 rounded-2xl p-5 mb-3 flex-row items-center">
                    <View className="w-11 h-11 rounded-xl bg-primary-100 items-center justify-center mr-4">
                      <Text className="text-xl">📄</Text>
                    </View>
                    <View className="flex-1">
                      <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg" numberOfLines={1}>
                        {text.title || text.topic}
                      </Text>
                      <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-base mt-1">
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

function StatItem({ emoji, value, label, bg }: {
  emoji: string;
  value: number;
  label: string;
  bg: string;
}) {
  return (
    <View className={`${bg} rounded-2xl p-5 flex-1 min-w-[45%]`}>
      <Text className="text-2xl">{emoji}</Text>
      <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-2xl text-owl-900 mt-2">
        {value}
      </Text>
      <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-600 text-base">
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
