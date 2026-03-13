import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { register, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

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
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 py-12">
            {/* Logo/Brand */}
            <View className="items-center mb-10">
              <Text className="text-4xl font-bold text-primary-600">
                Duopara
              </Text>
              <Text className="text-gray-600 mt-2 text-center">
                Start your language learning journey
              </Text>
            </View>

            {/* Register Card */}
            <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <Text className="text-2xl font-semibold text-center mb-6 text-gray-900">
                Create account
              </Text>

              {/* Error Alert */}
              {displayError && (
                <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <Text className="text-red-700 text-sm">{displayError}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      clearError();
                      setLocalError(null);
                    }}
                    className="absolute right-2 top-2"
                  >
                    <Text className="text-red-500 font-bold">×</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Name Input */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Name (optional)
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoCapitalize="words"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Password Input */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Confirm Password Input */}
              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Register Button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={isLoading}
                className={`w-full py-4 rounded-lg items-center flex-row justify-center ${
                  isLoading ? "bg-primary-400" : "bg-primary-600"
                }`}
              >
                {isLoading && (
                  <ActivityIndicator color="white" className="mr-2" />
                )}
                <Text className="text-white font-semibold text-lg">
                  {isLoading ? "Creating account..." : "Create account"}
                </Text>
              </TouchableOpacity>

              {/* Login Link */}
              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600">Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text className="text-primary-600 font-medium">
                      Sign in
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
