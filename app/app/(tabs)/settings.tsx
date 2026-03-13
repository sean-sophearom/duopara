import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../src/store/authStore";
import { settingsApi } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";

const difficultyOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
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
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Profile Section */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center">
              <Text className="text-2xl font-bold text-primary-600">
                {user?.name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"}
              </Text>
            </View>
            <View className="ml-4">
              <Text className="font-semibold text-gray-900 text-lg">
                {user?.name || "User"}
              </Text>
              <Text className="text-gray-500">{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Target Language */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">
            Target Language
          </Text>
          <Text className="text-sm text-gray-500 mb-3">
            The language you're learning
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {(languages || []).map((lang: any) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => setTargetLanguage(lang.code)}
                  className={`px-4 py-2 rounded-lg border ${
                    targetLanguage === lang.code
                      ? "bg-primary-50 border-primary-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={
                      targetLanguage === lang.code
                        ? "text-primary-700 font-medium"
                        : "text-gray-700"
                    }
                  >
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Native Language */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">
            Native Language
          </Text>
          <Text className="text-sm text-gray-500 mb-3">
            Your native language for translations
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {(languages || []).map((lang: any) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => setNativeLanguage(lang.code)}
                  className={`px-4 py-2 rounded-lg border ${
                    nativeLanguage === lang.code
                      ? "bg-primary-50 border-primary-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={
                      nativeLanguage === lang.code
                        ? "text-primary-700 font-medium"
                        : "text-gray-700"
                    }
                  >
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Default Difficulty */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">
            Default Difficulty
          </Text>
          <View className="flex-row gap-2">
            {difficultyOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setDefaultDifficulty(opt.value)}
                className={`flex-1 py-3 rounded-lg border ${
                  defaultDifficulty === opt.value
                    ? "bg-primary-50 border-primary-500"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    defaultDifficulty === opt.value
                      ? "text-primary-700"
                      : "text-gray-700"
                  }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Known Words Ratio */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">
            Known Words Ratio: {knownWordsRatio}%
          </Text>
          <Text className="text-sm text-gray-500 mb-3">
            Target percentage of known words in generated texts
          </Text>
          <View className="flex-row gap-2">
            {[50, 60, 70, 80, 90].map((ratio) => (
              <TouchableOpacity
                key={ratio}
                onPress={() => setKnownWordsRatio(ratio)}
                className={`flex-1 py-2 rounded-lg ${
                  knownWordsRatio === ratio
                    ? "bg-primary-100"
                    : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-center ${
                    knownWordsRatio === ratio
                      ? "text-primary-700 font-medium"
                      : "text-gray-600"
                  }`}
                >
                  {ratio}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save Button */}
        {hasChanges && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateMutation.isPending}
            className={`py-4 rounded-xl items-center mb-4 ${
              updateMutation.isPending ? "bg-primary-400" : "bg-primary-600"
            }`}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="py-4 rounded-xl items-center border border-red-300 bg-red-50 mb-8"
        >
          <View className="flex-row items-center">
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="text-red-600 font-semibold text-lg ml-2">
              Logout
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
