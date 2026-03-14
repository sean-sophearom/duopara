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
import { SafeAreaView } from "react-native-safe-area-context";

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

const statusConfig: Record<string, { 
  bg: string;
  text: string;
  label: string;
}> = {
  learning: { bg: "bg-warning-500", text: "text-white", label: "Learning" },
  learned: { bg: "bg-secondary-500", text: "text-white", label: "Learned" },
  mastered: { bg: "bg-primary-500", text: "text-white", label: "Mastered" },
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

  const renderItem = ({ item }: { item: any }) => {
    const config = statusConfig[item.status];
    
    return (
      <View className="bg-white rounded-xl p-4 mb-3" style={cardShadow}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-bold text-owl-800 text-lg">{item.word}</Text>
            {item.translation && (
              <Text className="text-owl-500 mt-1 text-base">{item.translation}</Text>
            )}
            {item.partOfSpeech && (
              <View className="bg-owl-100 px-2 py-0.5 rounded-full mt-2 self-start">
                <Text className="text-owl-500 text-xs italic">{item.partOfSpeech}</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => handleStatusChange(item.id, item.status)}
              activeOpacity={0.8}
              className={`px-3 py-1.5 rounded-full ${config.bg}`}
            >
              <Text className="text-xs font-bold text-white capitalize">
                {item.status}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.word)}
              className="p-2 bg-danger-100 rounded-full"
            >
              <Ionicons name="trash-outline" size={16} color="#ff4b4b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row items-center mt-3 gap-3 pt-3 border-t border-owl-100">
          <View className="flex-row items-center bg-owl-50 px-2 py-1 rounded-lg">
            <Ionicons name="eye" size={12} color="#777" />
            <Text className="text-owl-600 text-xs ml-1 font-medium">
              {item.timesEncountered} seen
            </Text>
          </View>
          <View className="flex-row items-center bg-primary-50 px-2 py-1 rounded-lg">
            <Ionicons name="checkmark-circle" size={12} color="#58cc02" />
            <Text className="text-primary-700 text-xs ml-1 font-medium">
              {item.timesCorrect} correct
            </Text>
          </View>
          {item.practiceStreak > 0 && (
            <View className="flex-row items-center bg-warning-100 px-2 py-1 rounded-lg">
              <Text className="text-warning-700 text-xs font-medium">
                {item.practiceStreak} streak
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-owl-50" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4">
        <Text className="text-owl-500 text-base">Your</Text>
        <Text className="text-owl-800 text-2xl font-bold mt-1">Vocabulary</Text>
        
        {/* Stats Row */}
        {stats && (
          <View className="flex-row gap-2 mt-4">
            <View className="flex-1 bg-white rounded-xl p-3 items-center" style={cardShadow}>
              <Text className="text-owl-800 font-bold text-xl">{stats.total || 0}</Text>
              <Text className="text-owl-500 text-xs">Total</Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 items-center" style={cardShadow}>
              <Text className="text-warning-500 font-bold text-xl">{stats.learning || 0}</Text>
              <Text className="text-owl-500 text-xs">Learning</Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 items-center" style={cardShadow}>
              <Text className="text-secondary-500 font-bold text-xl">{stats.learned || 0}</Text>
              <Text className="text-owl-500 text-xs">Learned</Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 items-center" style={cardShadow}>
              <Text className="text-primary-500 font-bold text-xl">{stats.mastered || 0}</Text>
              <Text className="text-owl-500 text-xs">Mastered</Text>
            </View>
          </View>
        )}
      </View>

      {/* Search and Filters */}
      <View className="px-5 mb-4">
        <View className="bg-white rounded-xl p-4" style={cardShadow}>
          <View className="flex-row items-center bg-owl-100 rounded-xl px-4 py-3 mb-3">
            <Ionicons name="search" size={20} color="#777" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search your vocabulary..."
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
            {[
              { key: "", label: "All" },
              { key: "learning", label: "Learning" },
              { key: "learned", label: "Learned" },
              { key: "mastered", label: "Mastered" },
            ].map((item) => {
              const isSelected = statusFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setStatusFilter(statusFilter === item.key ? "" : item.key)}
                  activeOpacity={0.8}
                  className={`flex-1 py-2 rounded-xl items-center ${
                    isSelected ? "bg-secondary-500" : "bg-owl-100"
                  }`}
                >
                  <Text className={`text-xs font-medium ${
                    isSelected ? "text-white" : "text-owl-600"
                  }`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Word List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <View className="bg-white rounded-xl p-6 items-center" style={cardShadow}>
            <ActivityIndicator size="large" color="#58cc02" />
            <Text className="text-owl-500 mt-3">Loading vocabulary...</Text>
          </View>
        </View>
      ) : words.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-24 h-24 rounded-full bg-secondary-100 items-center justify-center mb-4">
            <Ionicons name="book" size={48} color="#1cb0f6" />
          </View>
          <Text className="text-owl-800 text-xl font-bold mt-2">No words found</Text>
          <Text className="text-owl-500 text-center mt-2 max-w-xs">
            Start reading to build your vocabulary, or add words manually!
          </Text>
        </View>
      ) : (
        <FlatList
          data={words}
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
          onEndReached={() => {
            if (words.length < total) {
              setPage(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Button */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
        className="absolute bottom-24 right-5 w-14 h-14 rounded-xl bg-primary-500 items-center justify-center border-b-4 border-primary-700"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="w-12 h-1 bg-owl-200 rounded-full self-center mb-4" />
            
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-owl-800">Add New Word</Text>
              <TouchableOpacity 
                onPress={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-owl-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#777" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-owl-600 mb-2 ml-1">Word</Text>
              <View className="flex-row items-center bg-owl-100 rounded-xl px-4 py-3">
                <Ionicons name="text" size={20} color="#777" />
                <TextInput
                  value={newWord.word}
                  onChangeText={(text) => setNewWord({ ...newWord, word: text })}
                  placeholder="Enter word"
                  className="flex-1 ml-3 text-owl-800 text-base"
                  placeholderTextColor="#afafaf"
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-bold text-owl-600 mb-2 ml-1">
                Translation (optional)
              </Text>
              <View className="flex-row items-center bg-owl-100 rounded-xl px-4 py-3">
                <Ionicons name="language" size={20} color="#777" />
                <TextInput
                  value={newWord.translation}
                  onChangeText={(text) => setNewWord({ ...newWord, translation: text })}
                  placeholder="Enter translation"
                  className="flex-1 ml-3 text-owl-800 text-base"
                  placeholderTextColor="#afafaf"
                />
              </View>
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
              activeOpacity={0.8}
              className={`rounded-xl py-4 border-b-4 ${
                !newWord.word.trim() || addMutation.isPending
                  ? "bg-owl-200 border-owl-300"
                  : "bg-secondary-500 border-secondary-700"
              }`}
            >
              <Text className={`text-center font-bold text-lg ${
                !newWord.word.trim() || addMutation.isPending ? "text-owl-400" : "text-white"
              }`}>
                {addMutation.isPending ? "Adding..." : "Add Word"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
