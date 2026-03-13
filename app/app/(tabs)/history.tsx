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

  const renderItem = ({ item }: { item: any }) => (
    <Link href={`/read/${item.id}`} asChild>
      <TouchableOpacity className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-semibold text-gray-900" numberOfLines={2}>
              {item.title || item.topic}
            </Text>
            <Text className="text-gray-600 text-sm mt-1" numberOfLines={2}>
              {item.content?.substring(0, 100)}...
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.title || item.topic)}
            className="ml-2 p-2"
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center mt-3 gap-2">
          <View className="bg-primary-100 px-2 py-1 rounded">
            <Text className="text-xs text-primary-700">{item.language}</Text>
          </View>
          <View
            className={`px-2 py-1 rounded ${
              item.difficulty === "beginner"
                ? "bg-green-100"
                : item.difficulty === "advanced"
                ? "bg-red-100"
                : "bg-yellow-100"
            }`}
          >
            <Text
              className={`text-xs ${
                item.difficulty === "beginner"
                  ? "text-green-700"
                  : item.difficulty === "advanced"
                  ? "text-red-700"
                  : "text-yellow-700"
              }`}
            >
              {item.difficulty}
            </Text>
          </View>
          <Text className="text-gray-500 text-sm">{item.wordCount} words</Text>
          <Text className="text-gray-400 text-sm ml-auto">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search and Filter */}
      <View className="p-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search texts..."
            className="flex-1 ml-2 text-gray-900"
            placeholderTextColor="#9ca3af"
          />
          {search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setLanguageFilter("")}
            className={`px-3 py-1.5 rounded-lg ${
              languageFilter === ""
                ? "bg-primary-100 border border-primary-500"
                : "bg-gray-100"
            }`}
          >
            <Text
              className={
                languageFilter === "" ? "text-primary-700" : "text-gray-600"
              }
            >
              All
            </Text>
          </TouchableOpacity>
          {(languages || []).slice(0, 4).map((lang: any) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() =>
                setLanguageFilter(
                  languageFilter === lang.code ? "" : lang.code
                )
              }
              className={`px-3 py-1.5 rounded-lg ${
                languageFilter === lang.code
                  ? "bg-primary-100 border border-primary-500"
                  : "bg-gray-100"
              }`}
            >
              <Text
                className={
                  languageFilter === lang.code
                    ? "text-primary-700"
                    : "text-gray-600"
                }
              >
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Texts List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : texts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="book-outline" size={48} color="#9ca3af" />
          <Text className="text-gray-500 text-lg mt-4 text-center">
            No texts found
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            Generate your first reading material to get started
          </Text>
          <Link href="/(tabs)/generate" asChild>
            <TouchableOpacity className="bg-primary-600 px-6 py-3 rounded-xl mt-6">
              <Text className="text-white font-medium">Generate Text</Text>
            </TouchableOpacity>
          </Link>
        </View>
      ) : (
        <FlatList
          data={texts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
