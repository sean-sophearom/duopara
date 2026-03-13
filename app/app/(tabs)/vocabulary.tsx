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
  Modal,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vocabularyApi, settingsApi } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { Ionicons } from "@expo/vector-icons";

const statusColors: Record<string, { bg: string; text: string }> = {
  learning: { bg: "bg-yellow-100", text: "text-yellow-700" },
  learned: { bg: "bg-blue-100", text: "text-blue-700" },
  mastered: { bg: "bg-green-100", text: "text-green-700" },
};

export default function VocabularyScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState(
    user?.settings?.targetLanguage || ""
  );
  const [page, setPage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState({ word: "", translation: "" });
  const [refreshing, setRefreshing] = useState(false);

  const limit = 30;

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => settingsApi.getLanguages().then((r) => r.data.languages),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["vocabulary", search, statusFilter, languageFilter, page],
    queryFn: () =>
      vocabularyApi
        .getAll({
          search: search || undefined,
          status: statusFilter || undefined,
          language: languageFilter || undefined,
          limit,
          offset: page * limit,
        })
        .then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["vocabulary", "stats", languageFilter],
    queryFn: () =>
      vocabularyApi.getStats(languageFilter || undefined).then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (data: {
      word: string;
      language: string;
      translation?: string;
    }) => vocabularyApi.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      setShowAddModal(false);
      setNewWord({ word: "", translation: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      vocabularyApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: vocabularyApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  const handleDelete = (id: string, word: string) => {
    Alert.alert("Delete Word", `Are you sure you want to delete "${word}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const handleStatusChange = (id: string, currentStatus: string) => {
    const statuses = ["learning", "learned", "mastered"];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    updateMutation.mutate({ id, status: nextStatus });
  };

  const words = data?.words || [];
  const total = data?.total || 0;

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-lg">
            {item.word}
          </Text>
          {item.translation && (
            <Text className="text-gray-600 mt-1">{item.translation}</Text>
          )}
          {item.partOfSpeech && (
            <Text className="text-gray-400 text-sm mt-1 italic">
              {item.partOfSpeech}
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => handleStatusChange(item.id, item.status)}
            className={`px-3 py-1.5 rounded-lg ${statusColors[item.status]?.bg}`}
          >
            <Text className={`text-sm font-medium ${statusColors[item.status]?.text}`}>
              {item.status}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.word)}
            className="p-2"
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row items-center mt-3 gap-4">
        <View className="flex-row items-center">
          <Ionicons name="eye-outline" size={14} color="#9ca3af" />
          <Text className="text-gray-500 text-sm ml-1">
            {item.timesEncountered}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="checkmark-circle-outline" size={14} color="#9ca3af" />
          <Text className="text-gray-500 text-sm ml-1">
            {item.timesCorrect}
          </Text>
        </View>
        {item.practiceStreak > 0 && (
          <View className="flex-row items-center">
            <Ionicons name="flame-outline" size={14} color="#f59e0b" />
            <Text className="text-gray-500 text-sm ml-1">
              {item.practiceStreak}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Stats Summary */}
      {stats && (
        <View className="flex-row p-4 bg-white border-b border-gray-200 gap-4">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-gray-900">
              {stats.total || 0}
            </Text>
            <Text className="text-xs text-gray-500">Total</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {stats.learning || 0}
            </Text>
            <Text className="text-xs text-gray-500">Learning</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-blue-600">
              {stats.learned || 0}
            </Text>
            <Text className="text-xs text-gray-500">Learned</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-green-600">
              {stats.mastered || 0}
            </Text>
            <Text className="text-xs text-gray-500">Mastered</Text>
          </View>
        </View>
      )}

      {/* Search and Filters */}
      <View className="p-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search words..."
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
          {["", "learning", "learned", "mastered"].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() =>
                setStatusFilter(statusFilter === status ? "" : status)
              }
              className={`px-3 py-1.5 rounded-lg ${
                statusFilter === status
                  ? "bg-primary-100 border border-primary-500"
                  : "bg-gray-100"
              }`}
            >
              <Text
                className={
                  statusFilter === status ? "text-primary-700" : "text-gray-600"
                }
              >
                {status || "All"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Word List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : words.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="library-outline" size={48} color="#9ca3af" />
          <Text className="text-gray-500 text-lg mt-4 text-center">
            No words found
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            Start reading to build your vocabulary
          </Text>
        </View>
      ) : (
        <FlatList
          data={words}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={() => {
            if (words.length < total) {
              setPage(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Add Button */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-semibold text-gray-900">
                Add Word
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Word
              </Text>
              <TextInput
                value={newWord.word}
                onChangeText={(text) =>
                  setNewWord({ ...newWord, word: text })
                }
                placeholder="Enter word"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Translation (optional)
              </Text>
              <TextInput
                value={newWord.translation}
                onChangeText={(text) =>
                  setNewWord({ ...newWord, translation: text })
                }
                placeholder="Enter translation"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity
              onPress={() =>
                addMutation.mutate({
                  word: newWord.word,
                  language: languageFilter || user?.settings?.targetLanguage || "Spanish",
                  translation: newWord.translation || undefined,
                })
              }
              disabled={!newWord.word.trim() || addMutation.isPending}
              className={`w-full py-4 rounded-xl items-center ${
                !newWord.word.trim() || addMutation.isPending
                  ? "bg-primary-300"
                  : "bg-primary-600"
              }`}
            >
              <Text className="text-white font-semibold text-lg">
                {addMutation.isPending ? "Adding..." : "Add Word"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
