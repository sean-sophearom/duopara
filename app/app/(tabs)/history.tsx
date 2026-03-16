import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import ConfirmDialog from "../../src/components/ui/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { textsApi, settingsApi } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors } from "../../src/lib/theme";

const difficultyConfig = {
  beginner: { bg: "bg-primary-500", label: "Beginner" },
  intermediate: { bg: "bg-warning-500", label: "Intermediate" },
  advanced: { bg: "bg-danger-500", label: "Advanced" },
};

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const colors = useThemeColors();

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => settingsApi.getLanguages().then((r) => r.data.languages),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["texts", search, languageFilter],
    queryFn: () =>
      textsApi
        .getAll({
          search: search || undefined,
          language: languageFilter || undefined,
          limit: 50,
        })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: textsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["texts"] });
    },
  });

  const handleDelete = (id: string, title: string) => {
    setPendingDelete({ id, title });
  };

  const confirmDelete = () => {
    if (pendingDelete) {
      deleteMutation.mutate(pendingDelete.id);
      setPendingDelete(null);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  const texts = data?.texts || [];

  const renderItem = ({ item }: { item: any }) => {
    const difficulty = difficultyConfig[item.difficulty as keyof typeof difficultyConfig] || difficultyConfig.intermediate;
    
    return (
      <Link href={`/read/${item.id}`} asChild>
        <TouchableOpacity activeOpacity={0.7}>
          <View className="bg-owl-100 rounded-2xl p-5 mb-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg" numberOfLines={2}>
                  {item.title || item.topic}
                </Text>
                <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-base mt-2 leading-5" numberOfLines={2}>
                  {item.content?.substring(0, 100)}...
                </Text>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id, item.title || item.topic);
                }}
                className="p-2 bg-danger-100 rounded-xl"
              >
                <Ionicons name="trash-outline" size={16} color="#ff4b4b" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center mt-4 gap-2 flex-wrap">
              <View className="bg-owl-200 px-3 py-1.5 rounded-full">
                <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-sm text-owl-600">{item.language}</Text>
              </View>
              <View className={`${difficulty.bg} px-3 py-1.5 rounded-full`}>
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-sm text-white capitalize">
                  {item.difficulty}
                </Text>
              </View>
              <View className="bg-owl-200 px-3 py-1.5 rounded-full">
                <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-xs text-owl-600">{item.wordCount} words</Text>
              </View>
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-400 text-xs ml-auto">
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-owl-50" edges={["top"]}>
      {/* Header */}
      <View className="px-6 pt-6 pb-5">
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-xl">Your</Text>
        <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-owl-900 text-4xl mt-1">
          📚 Library
        </Text>
        
        <View className="bg-owl-100 rounded-2xl p-4 flex-row items-center mt-5">
          <Ionicons name="library" size={20} color="#ffc800" />
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-xl ml-3 mr-2">{texts.length}</Text>
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500">texts</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View className="px-6 mb-5">
        <View className="bg-owl-100 rounded-2xl p-5">
          <View className="flex-row items-center bg-owl-200 rounded-xl px-4 py-3 mb-4">
            <Ionicons name="search" size={20} color={colors.owl400} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search your texts..."
              className="flex-1 ml-3 text-owl-800 text-base"
              placeholderTextColor={colors.owl400}
              style={{ fontFamily: "Nunito_400Regular" }}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color={colors.owl500} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setLanguageFilter("")}
              activeOpacity={0.7}
              className={`px-4 py-2.5 rounded-xl ${
                languageFilter === "" ? "bg-secondary-500" : "bg-owl-200"
              }`}
            >
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className={`text-sm ${
                languageFilter === "" ? "text-white" : "text-owl-600"
              }`}>
                All
              </Text>
            </TouchableOpacity>
            {(languages || []).slice(0, 3).map((lang: any) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() =>
                  setLanguageFilter(languageFilter === lang.code ? "" : lang.code)
                }
                activeOpacity={0.7}
                className={`px-4 py-2.5 rounded-xl ${
                  languageFilter === lang.code ? "bg-secondary-500" : "bg-owl-200"
                }`}
              >
                <Text style={{ fontFamily: "Nunito_600SemiBold" }} className={`text-sm ${
                  languageFilter === lang.code ? "text-white" : "text-owl-600"
                }`}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Texts List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 mt-4">Loading texts...</Text>
        </View>
      ) : texts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="book" size={48} color="#ffc800" />
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-2xl mt-4">📖 No stories yet!</Text>
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-center mt-2 text-lg">
            Create your first reading adventure to get started
          </Text>
          <Link href="/(tabs)/generate" asChild>
            <TouchableOpacity activeOpacity={0.7} className="mt-6">
              <View className="bg-primary-500 rounded-2xl py-4 px-8">
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-lg">Create a Story ✨</Text>
              </View>
            </TouchableOpacity>
          </Link>
        </View>
      ) : (
        <FlatList
          data={texts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#2563eb"]}
              tintColor="#2563eb"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Delete text?"
        message={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : undefined}
        confirmText="Delete"
        confirmStyle="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </SafeAreaView>
  );
}
