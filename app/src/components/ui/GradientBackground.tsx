import { View, StatusBar } from "react-native";
import { useThemeColors } from "../../lib/theme";

interface BackgroundProps {
  children: React.ReactNode;
  variant?: "light" | "primary" | "dark";
}

export function GradientBackground({
  children,
  variant = "light",
}: BackgroundProps) {
  const colors = useThemeColors();
  const statusBarStyle = variant === "primary" ? "light-content" : colors.statusBar;

  return (
    <View className={`flex-1 ${variant === "primary" ? "bg-primary-500" : "bg-owl-50"}`}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      {children}
    </View>
  );
}

export const Background = GradientBackground;
