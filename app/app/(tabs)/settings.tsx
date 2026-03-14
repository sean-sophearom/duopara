import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../src/store/authStore";
import { settingsApi } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

const difficultyOptions = [
  { value: "beginner", label: "Beginner", bg: "bg-primary-500" },
  { value: "intermediate", label: "Intermediate", bg: "bg-warning-500" },
  { value: "advanced", label: "Advanced", bg: "bg-danger-500" },
];

export default function SettingsScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [targetLanguage, setTargetLanguage] = useState(
    user?.settings?.targetLanguage || "Spanish"
  );
  const [nativeLanguage, setNativeLanguage] = useState(
    user?.settings?.nativeLanguage || "English"
  );
  const [knownWordsRatio, setKnownWordsRatio] = useState(
    user?.settings?.knownWordsRatio || 80
  );
  const [defaultDifficulty, setDefaultDifficulty] = useState(
    user?.settings?.defaultDifficulty || "intermediate"
  );

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => settingsApi.getLanguages().then((r) => r.data.languages),
  });

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (response) => {
      updateUser({ settings: response.data.settings });
      queryClient.invalidateQueries();
      Alert.alert("Success", "Settings updated successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to update settings");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      targetLanguage,
      nativeLanguage,
      knownWordsRatio,
      defaultDifficulty,
    });
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const hasChanges =
    targetLanguage !== user?.settings?.targetLanguage ||
    nativeLanguage !== user?.settings?.nativeLanguage ||
    knownWordsRatio !== user?.settings?.knownWordsRatio ||
    defaultDifficulty !== user?.settings?.defaultDifficulty;

  return (
    <SafeAreaView className="flex-1 bg-owl-50" edges={["top"]}>
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <Text className="text-owl-500 text-base">Your</Text>
          <Text className="text-owl-800 text-2xl font-bold mt-1">Settings</Text>

          {/* Profile Card */}
          <View className="bg-white rounded-xl p-4 mt-4 flex-row items-center" style={cardShadow}>
            <View className="w-14 h-14 rounded-xl bg-secondary-100 items-center justify-center">
              <Text className="text-xl font-bold text-secondary-600">
                {user?.name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"}
              </Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-owl-800 text-lg">
                {user?.name || "User"}
              </Text>
              <Text className="text-owl-500 text-sm">{user?.email}</Text>
            </View>
          </View>
        </View>

        <View className="px-5">
          {/* Target Language */}
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <Text className="font-bold text-owl-800 mb-1">Target Language</Text>
            <Text className="text-xs text-owl-500 mb-3">The language you're learning</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(languages || []).map((lang: any) => {
                  const isSelected = targetLanguage === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => setTargetLanguage(lang.code)}
                      activeOpacity={0.8}
                      className={`px-4 py-2.5 rounded-xl ${
                        isSelected ? "bg-secondary-500" : "bg-owl-100"
                      }`}
                    >
                      <Text className={`font-medium ${
                        isSelected ? "text-white" : "text-owl-700"
                      }`}>
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Native Language */}
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <Text className="font-bold text-owl-800 mb-1">Native Language</Text>
            <Text className="text-xs text-owl-500 mb-3">Your native language for translations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(languages || []).map((lang: any) => {
                  const isSelected = nativeLanguage === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => setNativeLanguage(lang.code)}
                      activeOpacity={0.8}
                      className={`px-4 py-2.5 rounded-xl ${
                        isSelected ? "bg-primary-500" : "bg-owl-100"
                      }`}
                    >
                      <Text className={`font-medium ${
                        isSelected ? "text-white" : "text-owl-700"
                      }`}>
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Default Difficulty */}
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <Text className="font-bold text-owl-800 mb-3">Default Difficulty</Text>
            <View className="flex-row gap-2">
              {difficultyOptions.map((opt) => {
                const isSelected = defaultDifficulty === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDefaultDifficulty(opt.value)}
                    activeOpacity={0.8}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      isSelected ? opt.bg : "bg-owl-100"
                    }`}
                  >
                    <Text className={`font-bold text-sm ${
                      isSelected ? "text-white" : "text-owl-700"
                    }`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Known Words Ratio */}
          <View className="bg-white rounded-xl p-4 mb-4" style={cardShadow}>
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="font-bold text-owl-800">Known Words Ratio</Text>
                <Text className="text-xs text-owl-500">Target % of known words in texts</Text>
              </View>
              <View className="bg-secondary-100 px-3 py-1 rounded-full">
                <Text className="text-secondary-700 font-bold">{knownWordsRatio}%</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              {[50, 60, 70, 80, 90].map((ratio) => {
                const isSelected = knownWordsRatio === ratio;
                return (
                  <TouchableOpacity
                    key={ratio}
                    onPress={() => setKnownWordsRatio(ratio)}
                    activeOpacity={0.8}
                    className={`flex-1 py-2.5 rounded-xl items-center ${
                      isSelected ? "bg-secondary-500" : "bg-owl-100"
                    }`}
                  >
                    <Text className={`font-bold ${
                      isSelected ? "text-white" : "text-owl-600"
                    }`}>
                      {ratio}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
          {hasChanges && (
            <TouchableOpacity
              onPress={handleSave}
              disabled={updateMutation.isPending}
              activeOpacity={0.8}
              className="bg-primary-500 rounded-xl py-4 border-b-4 border-primary-700 mb-4"
            >
              <Text className="text-white text-center font-bold text-lg">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            className="bg-danger-100 rounded-xl py-4 flex-row items-center justify-center border border-danger-200"
          >
            <Ionicons name="log-out-outline" size={20} color="#ff4b4b" />
            <Text className="text-danger-600 font-bold text-lg ml-2">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
