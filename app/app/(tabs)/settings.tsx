import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import Toast from "react-native-toast-message";
import ConfirmDialog from "../../src/components/ui/ConfirmDialog";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../src/store/authStore";
import { settingsApi } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeStore, ThemeMode } from "../../src/store/themeStore";

const difficultyOptions = [
  { value: "beginner", label: "🌱 Beginner", bg: "bg-primary-500" },
  { value: "intermediate", label: "🌿 Intermediate", bg: "bg-warning-500" },
  { value: "advanced", label: "🌳 Advanced", bg: "bg-danger-500" },
];

const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "Auto", icon: "📱" },
];

export default function SettingsScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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

  // Local reading-highlight preferences (stored in AsyncStorage)
  const [highlightLearned, setHighlightLearned] = useState(true);
  const [highlightLearning, setHighlightLearning] = useState(true);
  const [highlightNew, setHighlightNew] = useState(true);

  useEffect(() => {
    (async () => {
      const hl = await AsyncStorage.getItem("duopara.highlightLearned");
      if (hl !== null) setHighlightLearned(hl !== "false");
      const hlr = await AsyncStorage.getItem("duopara.highlightLearning");
      if (hlr !== null) setHighlightLearning(hlr !== "false");
      const hn = await AsyncStorage.getItem("duopara.highlightNew");
      if (hn !== null) setHighlightNew(hn !== "false");
    })();
  }, []);

  const setHighlight = async (
    key: "duopara.highlightLearned" | "duopara.highlightLearning" | "duopara.highlightNew",
    setter: (v: boolean) => void,
    value: boolean,
  ) => {
    setter(value);
    await AsyncStorage.setItem(key, String(value));
  };

  const { data: languageConfig } = useQuery({
    queryKey: ["languages"],
    queryFn: () => settingsApi.getLanguages().then((r) => r.data),
  });

  const sameLanguage = (a?: string, b?: string) =>
    a?.trim().toLowerCase() === b?.trim().toLowerCase();

  const languages = languageConfig?.languages || [];
  const nativeLanguages = languageConfig?.nativeLanguages || languages;
  const targetLanguages = languages.filter((lang: any) => !sameLanguage(lang.code, nativeLanguage));
  const selectableNativeLanguages = nativeLanguages.filter((lang: any) => !sameLanguage(lang.code, targetLanguage));

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (response) => {
      updateUser({ settings: response.data.settings });
      queryClient.invalidateQueries();
      Toast.show({
        type: "success",
        text1: "Settings saved",
        text2: "Your preferences have been updated",
        visibilityTime: 3000,
      });
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: "Save failed",
        text2: "Could not update settings. Please try again.",
        visibilityTime: 3000,
      });
    },
  });

  const handleSave = () => {
    if (sameLanguage(targetLanguage, nativeLanguage)) {
      Toast.show({
        type: "error",
        text1: "Choose different languages",
        text2: "Target and native language cannot be the same.",
        visibilityTime: 3000,
      });
      return;
    }

    updateMutation.mutate({
      targetLanguage,
      nativeLanguage,
      knownWordsRatio,
      defaultDifficulty,
    });
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    router.replace("/(auth)/login");
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
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-5">
          <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-xl">Your</Text>
          <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-owl-900 text-4xl mt-1">Profile ⚙️</Text>

          {/* Profile Card */}
          <View className="bg-owl-100 rounded-2xl p-5 mt-5 flex-row items-center">
            <View className="w-16 h-16 rounded-2xl bg-secondary-200 items-center justify-center">
              <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-2xl text-secondary-500">
                {user?.name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-xl">
                {user?.name || "User"}
              </Text>
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 text-sm">{user?.email}</Text>
            </View>
          </View>
        </View>

        <View className="px-6">
          {/* Theme */}
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-1">Appearance</Text>
            <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-base text-owl-500 mb-4">Choose your vibe</Text>
            <View className="flex-row gap-2">
              {themeOptions.map((opt) => {
                const isSelected = themeMode === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setThemeMode(opt.value)}
                    activeOpacity={0.7}
                    className={`flex-1 py-3.5 rounded-xl items-center ${
                      isSelected ? "bg-secondary-500" : "bg-owl-200"
                    }`}
                  >
                    <Text className="text-lg mb-0.5">{opt.icon}</Text>
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-base ${
                      isSelected ? "text-white" : "text-owl-700"
                    }`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Target Language */}
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-1">🌍 Target Language</Text>
            <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-base text-owl-500 mb-4">The language you're learning</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {targetLanguages.map((lang: any) => {
                  const isSelected = targetLanguage === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => setTargetLanguage(lang.code)}
                      activeOpacity={0.7}
                      className={`px-4 py-2.5 rounded-xl ${
                        isSelected ? "bg-secondary-500" : "bg-owl-200"
                      }`}
                    >
                      <Text style={{ fontFamily: "Nunito_600SemiBold" }} className={`${
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
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-1">💬 Native Language</Text>
            <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-base text-owl-500 mb-4">Your native language for translations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {selectableNativeLanguages.map((lang: any) => {
                  const isSelected = nativeLanguage === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => setNativeLanguage(lang.code)}
                      activeOpacity={0.7}
                      className={`px-4 py-2.5 rounded-xl ${
                        isSelected ? "bg-primary-500" : "bg-owl-200"
                      }`}
                    >
                      <Text style={{ fontFamily: "Nunito_600SemiBold" }} className={`${
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
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-4">🎯 Difficulty Level</Text>
            <View className="flex-col sm:flex-row gap-2">
              {difficultyOptions.map((opt) => {
                const isSelected = defaultDifficulty === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDefaultDifficulty(opt.value)}
                    activeOpacity={0.7}
                    className={`flex-1 py-3.5 rounded-xl items-center ${
                      isSelected ? opt.bg : "bg-owl-200"
                    }`}
                  >
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-base ${
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
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg">📊 Known Words Ratio</Text>
                <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-base text-owl-500 mt-0.5">Target % of known words in texts</Text>
              </View>
              <View className="bg-secondary-200 px-3 py-1.5 rounded-full">
                <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-secondary-500 text-lg">{knownWordsRatio}%</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              {[50, 60, 70, 80, 90].map((ratio) => {
                const isSelected = knownWordsRatio === ratio;
                return (
                  <TouchableOpacity
                    key={ratio}
                    onPress={() => setKnownWordsRatio(ratio)}
                    activeOpacity={0.7}
                    className={`flex-1 py-2.5 rounded-xl items-center ${
                      isSelected ? "bg-secondary-500" : "bg-owl-200"
                    }`}
                  >
                    <Text style={{ fontFamily: "Nunito_700Bold" }} className={`${
                      isSelected ? "text-white" : "text-owl-600"
                    }`}>
                      {ratio}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Reading Highlights */}
          <View className="bg-owl-100 rounded-2xl p-5 mb-5">
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800 text-lg mb-1">🎨 Reading Highlights</Text>
            <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-base text-owl-500 mb-4">Choose which words are highlighted while reading</Text>
            {(
              [
                { label: "New words", sublabel: "Words you haven't seen before", color: "text-blue-500", value: highlightNew, key: "duopara.highlightNew" as const, setter: setHighlightNew },
                { label: "Learning words", sublabel: "Words you're actively studying", color: "text-yellow-600", value: highlightLearning, key: "duopara.highlightLearning" as const, setter: setHighlightLearning },
                { label: "Learned words", sublabel: "Words you've marked as known", color: "text-green-600", value: highlightLearned, key: "duopara.highlightLearned" as const, setter: setHighlightLearned },
              ] as const
            ).map((item) => (
              <View key={item.key} className="flex-row items-center justify-between py-3 border-b border-owl-200 last:border-b-0">
                <View className="flex-1 mr-3">
                  <Text style={{ fontFamily: "Nunito_600SemiBold" }} className={`text-base ${item.color}`}>{item.label}</Text>
                  <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-sm text-owl-500 mt-0.5">{item.sublabel}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={(v) => setHighlight(item.key, item.setter, v)}
                  trackColor={{ false: "#e2e8f0", true: "#2563eb" }}
                  thumbColor="white"
                />
              </View>
            ))}
          </View>

          {/* Save Button */}
          {hasChanges && (
            <TouchableOpacity
              onPress={handleSave}
              disabled={updateMutation.isPending}
              activeOpacity={0.7}
              className="bg-primary-500 rounded-2xl py-5 mb-5"
            >
              <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-white text-center text-lg">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.7}
            className="bg-danger-100 rounded-2xl py-4 flex-row items-center justify-center"
          >
            <Ionicons name="log-out-outline" size={20} color="#ff4b4b" />
            <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-danger-600 text-lg ml-2">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Log out?"
        message="You will be returned to the login screen."
        confirmText="Log out"
        confirmStyle="destructive"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </SafeAreaView>
  );
}
