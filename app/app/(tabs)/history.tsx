import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { textsApi, settingsApi } from "../../src/lib/api";
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
    Alert.alert("Delete Text", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
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
        <TouchableOpacity activeOpacity={0.8}>
          <View className="bg-white rounded-xl p-4 mb-3" style={cardShadow}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-bold text-owl-800 text-base" numberOfLines={2}>
                  {item.title || item.topic}
                </Text>
                <Text className="text-owl-500 text-sm mt-2 leading-5" numberOfLines={2}>
                  {item.content?.substring(0, 100)}...
                </Text>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id, item.title || item.topic);
                }}
                className="p-2 bg-danger-100 rounded-full"
              >
                <Ionicons name="trash-outline" size={16} color="#ff4b4b" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center mt-4 gap-2 flex-wrap">
              <View className="bg-secondary-100 px-3 py-1.5 rounded-full">
                <Text className="text-xs font-medium text-secondary-700">{item.language}</Text>
              </View>
              <View className={`${difficulty.bg} px-3 py-1.5 rounded-full`}>
                <Text className="text-xs font-bold text-white capitalize">
                  {item.difficulty}
                </Text>
              </View>
              <View className="bg-owl-100 px-3 py-1.5 rounded-full">
                <Text className="text-xs font-medium text-owl-600">{item.wordCount} words</Text>
              </View>
              <Text className="text-owl-400 text-xs ml-auto">
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
      <View className="px-5 pt-4 pb-4">
        <Text className="text-owl-500 text-base">Your</Text>
        <Text className="text-owl-800 text-2xl font-bold mt-1">Reading History</Text>
        
        <View className="bg-white rounded-xl p-3 flex-row items-center mt-4" style={cardShadow}>
          <View className="w-10 h-10 rounded-lg bg-warning-100 items-center justify-center mr-3">
            <Ionicons name="library" size={20} color="#ffc800" />
          </View>
          <Text className="text-owl-800 font-bold text-xl mr-2">{texts.length}</Text>
          <Text className="text-owl-500">texts in your library</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View className="px-5 mb-4">
        <View className="bg-white rounded-xl p-4" style={cardShadow}>
          <View className="flex-row items-center bg-owl-100 rounded-xl px-4 py-3 mb-3">
            <Ionicons name="search" size={20} color="#777" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search your texts..."
              className="flex-1 ml-3 text-owl-800 text-base"
              placeholderTextColor="#afafaf"
            />
            {search && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color="#afafaf" />
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setLanguageFilter("")}
              activeOpacity={0.8}
              className={`px-4 py-2 rounded-xl ${
                languageFilter === "" ? "bg-secondary-500" : "bg-owl-100"
              }`}
            >
              <Text className={`text-sm font-medium ${
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
                activeOpacity={0.8}
                className={`px-4 py-2 rounded-xl ${
                  languageFilter === lang.code ? "bg-secondary-500" : "bg-owl-100"
                }`}
              >
                <Text className={`text-sm font-medium ${
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
          <View className="bg-white rounded-xl p-6 items-center" style={cardShadow}>
            <ActivityIndicator size="large" color="#58cc02" />
            <Text className="text-owl-500 mt-3">Loading texts...</Text>
          </View>
        </View>
      ) : texts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-24 h-24 rounded-full bg-warning-100 items-center justify-center mb-4">
            <Ionicons name="book" size={48} color="#ffc800" />
          </View>
          <Text className="text-owl-800 text-xl font-bold mt-2">No texts found</Text>
          <Text className="text-owl-500 text-center mt-2 max-w-xs">
            Generate your first reading material to get started
          </Text>
          <Link href="/(tabs)/generate" asChild>
            <TouchableOpacity activeOpacity={0.8} className="mt-6">
              <View className="bg-primary-500 rounded-xl py-4 px-8 border-b-4 border-primary-700">
                <Text className="text-white font-bold text-lg">Generate Text</Text>
              </View>
            </TouchableOpacity>
          </Link>
        </View>
      ) : (
        <FlatList
          data={texts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#58cc02"]}
              tintColor="#58cc02"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
