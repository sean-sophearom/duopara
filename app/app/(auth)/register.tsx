import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientButton } from "../../src/components/ui";

import { useThemeColors } from "../../src/lib/theme";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { register, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  const colors = useThemeColors();

  const handleRegister = async () => {
    setLocalError(null);
    
    if (password !== confirmPassword) {
      setLocalError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }

    try {
      await register(email, password, name || undefined);
      router.replace("/(tabs)/dashboard");
    } catch {
      // Error handled by store
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView className="flex-1 bg-owl-50">
      <StatusBar barStyle={colors.statusBar} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 py-8">
            {/* Logo */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 rounded-2xl bg-secondary-500 items-center justify-center mb-4">
                <Text className="text-4xl">🚀</Text>
              </View>
              <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-4xl text-owl-900">Join Duopara</Text>
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 mt-1 text-lg">Start learning today</Text>
            </View>

            {/* Error */}
            {displayError && (
              <View className="bg-danger-100 rounded-2xl p-4 mb-6 flex-row items-center">
                <Ionicons name="alert-circle" size={20} color="#ff4b4b" />
                <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-danger-600 text-sm ml-2 flex-1">{displayError}</Text>
                <TouchableOpacity onPress={() => { clearError(); setLocalError(null); }}>
                  <Ionicons name="close" size={20} color="#ff4b4b" />
                </TouchableOpacity>
              </View>
            )}

            {/* Name Input */}
            <View className="mb-4">
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700 mb-2 ml-1">Name (optional)</Text>
              <View className="flex-row items-center bg-owl-200 rounded-2xl px-4 py-3.5">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoCapitalize="words"
                  className="flex-1 text-base text-owl-800"
                  placeholderTextColor={colors.owl400}
                  style={{ fontFamily: "Nunito_400Regular" }}
                />
              </View>
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700 mb-2 ml-1">Email</Text>
              <View className="flex-row items-center bg-owl-200 rounded-2xl px-4 py-3.5">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-base text-owl-800"
                  placeholderTextColor={colors.owl400}
                  style={{ fontFamily: "Nunito_400Regular" }}
                />
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700 mb-2 ml-1">Password</Text>
              <View className="flex-row items-center bg-owl-200 rounded-2xl px-4 py-3.5">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-base text-owl-800"
                  placeholderTextColor={colors.owl400}
                  style={{ fontFamily: "Nunito_400Regular" }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.owl500}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View className="mb-8">
              <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700 mb-2 ml-1">Confirm Password</Text>
              <View className="flex-row items-center bg-owl-200 rounded-2xl px-4 py-3.5">
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-base text-owl-800"
                  placeholderTextColor={colors.owl400}
                  style={{ fontFamily: "Nunito_400Regular" }}
                />
              </View>
            </View>

            {/* Register Button */}
            <GradientButton
              title={isLoading ? "Creating account..." : "CREATE ACCOUNT"}
              onPress={handleRegister}
              variant="secondary"
              disabled={isLoading}
              loading={isLoading}
              fullWidth
              size="lg"
            />

            {/* Login Link */}
            <View className="flex-row justify-center mt-8">
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500">Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-secondary-500">SIGN IN</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
