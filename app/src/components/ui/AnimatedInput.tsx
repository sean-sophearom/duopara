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
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);
  const labelPosition = useSharedValue(value ? 1 : 0);
  const borderWidth = useSharedValue(1);

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
          ["#333333", "#58cc02"]
        ),
    backgroundColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      ["#252525", "#1a2e1a"]
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
          ["#888888", "#58cc02"]
        ),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      focusProgress.value,
      [0, 1],
      ["#555555", "#58cc02"]
    ),
  }));

  return (
    <View className="mb-4">
      <AnimatedView
        style={containerStyle}
        className="rounded-2xl px-4 pt-5 pb-3 flex-row items-center"
      >
        {icon && (
          <Animated.View style={iconStyle} className="mr-3">
            <Ionicons name={icon} size={22} color={isFocused ? "#58cc02" : "#555555"} />
          </Animated.View>
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
            placeholderTextColor="#555555"
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
