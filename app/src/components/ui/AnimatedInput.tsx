import { TextInput, View, Text, TextInputProps } from "react-native";
import { useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../lib/theme";

const AnimatedView = Animated.createAnimatedComponent(View);

interface AnimatedInputProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  variant?: "default" | "filled" | "glass";
}

export function AnimatedInput({
  label,
  icon,
  error,
  variant = "default",
  onFocus,
  onBlur,
  value,
  ...props
}: AnimatedInputProps) {
  const colors = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);
  const labelPosition = useSharedValue(value ? 1 : 0);
  const borderWidth = useSharedValue(1);

  const borderIdle = colors.owl300;
  const bgIdle = colors.owl200;
  const bgFocused = colors.colorScheme === 'dark' ? '#1a2e1a' : '#e8f5e9';
  const labelIdle = colors.owl500;
  const iconIdle = colors.owl400;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
    labelPosition.value = withSpring(1, { damping: 15 });
    borderWidth.value = withSpring(2);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
    if (!value) {
      labelPosition.value = withSpring(0, { damping: 15 });
    }
    borderWidth.value = withSpring(1);
    onBlur?.(e);
  };

  const containerStyle = useAnimatedStyle(() => ({
    borderWidth: borderWidth.value,
    borderColor: error
      ? "#ef4444"
      : interpolateColor(
          focusProgress.value,
          [0, 1],
          [borderIdle, "#58cc02"]
        ),
    backgroundColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [bgIdle, bgFocused]
    ),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: labelPosition.value * -24 },
      { scale: 1 - labelPosition.value * 0.15 },
    ],
    color: error
      ? "#ef4444"
      : interpolateColor(
          focusProgress.value,
          [0, 1],
          [labelIdle, "#58cc02"]
        ),
  }));

  return (
    <View className="mb-4">
      <AnimatedView
        style={containerStyle}
        className="rounded-2xl px-4 pt-5 pb-3 flex-row items-center"
      >
        {icon && (
          <View className="mr-3">
            <Ionicons name={icon} size={22} color={isFocused ? "#58cc02" : iconIdle} />
          </View>
        )}
        <View className="flex-1 relative">
          <Animated.Text
            style={labelStyle}
            className="absolute top-0 left-0 text-base bg-transparent"
          >
            {label}
          </Animated.Text>
          <TextInput
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="text-base text-owl-800 py-0"
            placeholderTextColor={colors.owl400}
            style={{ fontFamily: "Nunito_400Regular" }}
            {...props}
          />
        </View>
      </AnimatedView>
      {error && (
        <Text className="text-red-500 text-sm mt-1 ml-4">{error}</Text>
      )}
    </View>
  );
}
