import { View, StatusBar } from "react-native";

interface BackgroundProps {
  children: React.ReactNode;
  variant?: "light" | "primary" | "dark";
}

const backgrounds = {
  light: { bg: "bg-owl-50", statusBar: "dark-content" as const },
  primary: { bg: "bg-primary-500", statusBar: "light-content" as const },
  dark: { bg: "bg-owl-900", statusBar: "light-content" as const },
};

// Simple solid background - no gradients, no animations
export function GradientBackground({
  children,
  variant = "light",
}: BackgroundProps) {
  const style = backgrounds[variant];

  return (
    <View className={`flex-1 ${style.bg}`}>
      <StatusBar
        barStyle={style.statusBar}
        backgroundColor="transparent"
        translucent
      />
      {children}
    </View>
  );
}

// Alias
export const Background = GradientBackground;
