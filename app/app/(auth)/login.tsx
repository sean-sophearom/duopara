import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientButton } from "../../src/components/ui";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <SafeAreaView className="flex-1 bg-owl-50">
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          {/* Logo */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 rounded-2xl bg-primary-500 items-center justify-center mb-4">
              <Text className="text-4xl">🦉</Text>
            </View>
            <Text style={{ fontFamily: "Nunito_800ExtraBold" }} className="text-3xl text-owl-900">Duopara</Text>
            <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500 mt-1">Learn through reading</Text>
          </View>

          {/* Error */}
          {error && (
            <View className="bg-danger-100 rounded-2xl p-4 mb-6 flex-row items-center">
              <Ionicons name="alert-circle" size={20} color="#ff4b4b" />
              <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-danger-600 text-sm ml-2 flex-1">{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Ionicons name="close" size={20} color="#ff4b4b" />
              </TouchableOpacity>
            </View>
          )}

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
                placeholderTextColor="#555555"
                style={{ fontFamily: "Nunito_400Regular" }}
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-8">
            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className="text-owl-700 mb-2 ml-1">Password</Text>
            <View className="flex-row items-center bg-owl-200 rounded-2xl px-4 py-3.5">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                className="flex-1 text-base text-owl-800"
                placeholderTextColor="#555555"
                style={{ fontFamily: "Nunito_400Regular" }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#888888"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <GradientButton
            title={isLoading ? "Signing in..." : "SIGN IN"}
            onPress={handleLogin}
            disabled={isLoading}
            loading={isLoading}
            fullWidth
            size="lg"
          />

          {/* Register Link */}
          <View className="flex-row justify-center mt-8">
            <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-owl-500">Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-primary-500">SIGN UP</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
