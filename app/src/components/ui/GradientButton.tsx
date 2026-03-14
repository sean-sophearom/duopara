import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variants = {
  primary: {
    bg: "bg-primary-500",
    border: "border-primary-700",
    text: "text-white",
    shadow: "#4caf00",
  },
  secondary: {
    bg: "bg-secondary-500",
    border: "border-secondary-700",
    text: "text-white",
    shadow: "#1899d6",
  },
  danger: {
    bg: "bg-danger-500",
    border: "border-danger-700",
    text: "text-white",
    shadow: "#dc2626",
  },
  outline: {
    bg: "bg-white",
    border: "border-owl-200",
    text: "text-owl-700",
    shadow: "#e5e5e5",
  },
};

const sizes = {
  sm: { padding: "py-2 px-4", text: "text-sm", height: 36 },
  md: { padding: "py-3 px-6", text: "text-base", height: 48 },
  lg: { padding: "py-4 px-8", text: "text-lg", height: 56 },
};

export function GradientButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const style = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`
        ${style.bg} 
        ${sizeStyle.padding}
        rounded-xl
        border-b-4
        ${style.border}
        ${fullWidth ? "w-full" : ""}
        ${disabled ? "opacity-50" : ""}
        flex-row items-center justify-center
      `}
      style={{ minHeight: sizeStyle.height }}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? "#3c3c3c" : "#ffffff"} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`${style.text} ${sizeStyle.text} font-bold`}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Simple Button alias
export const Button = GradientButton;
