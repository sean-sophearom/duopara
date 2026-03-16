import "../src/global.css";
import { useEffect, useCallback, useMemo } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../src/store/authStore";
import { View, ActivityIndicator, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
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

type ToastColors = ReturnType<typeof import("../src/lib/theme").useThemeColors>;

function makeToastConfig(colors: ToastColors) {
  const toastRow = (accentColor: string) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.owl100,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: accentColor,
  });

  const iconCircle = (accentColor: string) => ({
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: accentColor + "22",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  });

  const renderToast = (
    accentColor: string,
    iconName: React.ComponentProps<typeof Ionicons>["name"],
    text1?: string | null,
    text2?: string | null,
  ) => (
    <View style={toastRow(accentColor)}>
      <View style={iconCircle(accentColor)}>
        <Ionicons name={iconName} size={20} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        {text1 ? (
          <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: colors.owl800 }}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            style={{
              fontFamily: "Nunito_400Regular",
              fontSize: 13,
              color: colors.owl500,
              marginTop: 2,
            }}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return {
    success: (props: React.ComponentProps<typeof BaseToast>) =>
      renderToast("#2563eb", "checkmark-circle", props.text1, props.text2),
    error: (props: React.ComponentProps<typeof ErrorToast>) =>
      renderToast("#ff4b4b", "close-circle", props.text1, props.text2),
    info: (props: React.ComponentProps<typeof BaseToast>) =>
      renderToast("#8b5cf6", "information-circle", props.text1, props.text2),
  };
}

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
        <ActivityIndicator size="large" color="#2563eb" />
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
  const toastConfig = useMemo(() => makeToastConfig(colors), [colors]);

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
      <BottomSheetModalProvider>
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
      </BottomSheetModalProvider>
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}
