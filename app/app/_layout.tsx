import "../src/global.css";
import { useEffect, useCallback } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../src/store/authStore";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import * as SplashScreen from "expo-splash-screen";
import { useThemeStore } from "../src/store/themeStore";
import { useThemeColors } from "../src/lib/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isInitialized, initialize } = useAuthStore();
  const { initialize: initTheme } = useThemeStore();

  useEffect(() => {
    initialize();
    initTheme();
  }, []);

  if (!isInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-owl-50">
        <ActivityIndicator size="large" color="#58cc02" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const colors = useThemeColors();

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.owl50,
              },
              headerTintColor: colors.owl800,
              headerTitleStyle: {
                fontWeight: "600",
                fontFamily: "Nunito_700Bold",
              },
              contentStyle: {
                backgroundColor: colors.owl50,
              },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="read/[id]"
              options={{
                title: "Reading",
                headerBackTitle: "Back",
              }}
            />
            <Stack.Screen
              name="practice/session"
              options={{
                title: "Practice",
                headerBackTitle: "Back",
              }}
            />
          </Stack>
          <StatusBar style={colors.statusBar === 'light-content' ? 'light' : 'dark'} />
        </AuthGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
