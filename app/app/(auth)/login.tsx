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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await login(email, password);
      router.replace("/(tabs)/dashboard");
    } catch {
      // Error handled by store
    }
  };

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
                Learn languages through personalized reading
              </Text>
            </View>

            {/* Login Card */}
            <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <Text className="text-2xl font-semibold text-center mb-6 text-gray-900">
                Welcome back
              </Text>

              {/* Error Alert */}
              {error && (
                <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <Text className="text-red-700 text-sm">{error}</Text>
                  <TouchableOpacity
                    onPress={clearError}
                    className="absolute right-2 top-2"
                  >
                    <Text className="text-red-500 font-bold">×</Text>
                  </TouchableOpacity>
                </View>
              )}

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
              <View className="mb-6">
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

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                className={`w-full py-4 rounded-lg items-center flex-row justify-center ${
                  isLoading ? "bg-primary-400" : "bg-primary-600"
                }`}
              >
                {isLoading && (
                  <ActivityIndicator color="white" className="mr-2" />
                )}
                <Text className="text-white font-semibold text-lg">
                  {isLoading ? "Signing in..." : "Sign in"}
                </Text>
              </TouchableOpacity>

              {/* Register Link */}
              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600">Don't have an account? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text className="text-primary-600 font-medium">
                      Sign up
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
