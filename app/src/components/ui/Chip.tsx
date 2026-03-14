import { TouchableOpacity, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "default" | "primary" | "secondary" | "accent" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  count?: number;
}

const variantStyles = {
  default: {
    selected: {
      bg: ["#2a94ff", "#1a75ff"] as const,
      text: "text-white",
      iconColor: "#ffffff",
    },
    unselected: {
      bg: ["#f1f5f9", "#e2e8f0"] as const,
      text: "text-gray-600",
      iconColor: "#64748b",
    },
  },
  primary: {
    selected: {
      bg: ["#2a94ff", "#145deb"] as const,
      text: "text-white",
      iconColor: "#ffffff",
    },
    unselected: {
      bg: ["#eef8ff", "#d8eeff"] as const,
      text: "text-primary-600",
      iconColor: "#2a94ff",
    },
  },
  secondary: {
    selected: {
      bg: ["#a855f7", "#9333ea"] as const,
      text: "text-white",
      iconColor: "#ffffff",
    },
    unselected: {
      bg: ["#faf5ff", "#f3e8ff"] as const,
      text: "text-secondary-600",
      iconColor: "#a855f7",
    },
  },
  accent: {
    selected: {
      bg: ["#f93f68", "#e71d53"] as const,
      text: "text-white",
      iconColor: "#ffffff",
    },
    unselected: {
      bg: ["#fff1f3", "#ffe4e8"] as const,
      text: "text-accent-600",
      iconColor: "#f93f68",
    },
  },
  success: {
    selected: {
      bg: ["#10b981", "#059669"] as const,
      text: "text-white",
      iconColor: "#ffffff",
    },
    unselected: {
      bg: ["#ecfdf5", "#d1fae5"] as const,
      text: "text-success-600",
      iconColor: "#10b981",
    },
  },
  warning: {
    selected: {
      bg: ["#f97316", "#ea580c"] as const,
      text: "text-white",
      iconColor: "#ffffff",
    },
    unselected: {
      bg: ["#fff7ed", "#ffedd5"] as const,
      text: "text-warning-600",
      iconColor: "#f97316",
    },
  },
};

const sizeStyles = {
  sm: {
    padding: "px-3 py-1.5",
    text: "text-xs",
    icon: 14,
  },
  md: {
    padding: "px-4 py-2",
    text: "text-sm",
    icon: 16,
  },
  lg: {
    padding: "px-5 py-2.5",
    text: "text-base",
    icon: 18,
  },
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  variant = "default",
  size = "md",
  disabled = false,
  count,
}: ChipProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const style = variantStyles[variant];
  const currentStyle = selected ? style.selected : style.unselected;
  const sizeStyle = sizeStyles[size];

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
      style={[animatedStyle, disabled && { opacity: 0.5 }]}
    >
      <LinearGradient
        colors={currentStyle.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className={`rounded-full flex-row items-center ${sizeStyle.padding}`}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={sizeStyle.icon}
            color={currentStyle.iconColor}
            style={{ marginRight: 6 }}
          />
        )}
        <Text className={`font-semibold ${currentStyle.text} ${sizeStyle.text}`}>
          {label}
        </Text>
        {count !== undefined && (
          <View className="ml-2 bg-white/30 rounded-full px-1.5 py-0.5 min-w-[20px] items-center">
            <Text className={`${currentStyle.text} text-xs font-bold`}>
              {count}
            </Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
}

interface ChipGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ChipGroup({ children, className = "" }: ChipGroupProps) {
  return (
    <View className={`flex-row flex-wrap gap-2 ${className}`}>
      {children}
    </View>
  );
}
