import { View, Text } from "react-native";

interface ProgressBarProps {
  progress: number; // 0-100
  variant?: "primary" | "secondary" | "warning" | "danger";
  height?: number;
  showLabel?: boolean;
}

const colors = {
  primary: "bg-primary-500",
  secondary: "bg-secondary-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
};

export function ProgressBar({
  progress,
  variant = "primary",
  height = 8,
  showLabel = false,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View>
      {showLabel && (
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-owl-500">Progress</Text>
          <Text className="text-sm font-bold text-owl-700">{Math.round(clampedProgress)}%</Text>
        </View>
      )}
      <View
        className="bg-owl-200 rounded-full overflow-hidden"
        style={{ height }}
      >
        <View
          className={`${colors[variant]} rounded-full h-full`}
          style={{ width: `${clampedProgress}%` }}
        />
      </View>
    </View>
  );
}

interface StreakBadgeProps {
  count: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const streakSizes = {
  sm: { badge: 36, text: "text-sm" },
  md: { badge: 48, text: "text-lg" },
  lg: { badge: 64, text: "text-2xl" },
};

export function StreakBadge({
  count,
  size = "md",
  showLabel = true,
}: StreakBadgeProps) {
  const sizeStyle = streakSizes[size];

  return (
    <View className="items-center">
      <View
        className="bg-warning-500 rounded-full items-center justify-center"
        style={{
          width: sizeStyle.badge,
          height: sizeStyle.badge,
        }}
      >
        <Text style={{ fontSize: sizeStyle.badge * 0.4 }}>🔥</Text>
      </View>
      <Text style={{ fontFamily: "Nunito_700Bold" }} className={`text-owl-800 mt-1 ${sizeStyle.text}`}>
        {count}
      </Text>
      {showLabel && (
        <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-xs text-owl-500">day streak</Text>
      )}
    </View>
  );
}

interface CircularProgressProps {
  progress: number;
  size?: number;
  children?: React.ReactNode;
}

export function CircularProgress({
  progress,
  size = 80,
  children,
}: CircularProgressProps) {
  // Simple circular progress using border trick
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View
      className="items-center justify-center bg-owl-200 rounded-full"
      style={{ width: size, height: size }}
    >
      <View
        className="absolute bg-primary-500 rounded-full"
        style={{
          width: size - 8,
          height: size - 8,
          opacity: clampedProgress / 100,
        }}
      />
      <View
        className="bg-owl-50 rounded-full items-center justify-center"
        style={{ width: size - 16, height: size - 16 }}
      >
        {children || (
          <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-owl-800">
            {Math.round(clampedProgress)}%
          </Text>
        )}
      </View>
    </View>
  );
}
