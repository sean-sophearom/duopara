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
    text: "text-white",
  },
  secondary: {
    bg: "bg-secondary-500",
    text: "text-white",
  },
  danger: {
    bg: "bg-danger-500",
    text: "text-white",
  },
  outline: {
    bg: "bg-owl-200",
    text: "text-owl-800",
  },
};

const sizes = {
  sm: { padding: "py-2 px-4", text: "text-sm", height: 36 },
  md: { padding: "py-3 px-6", text: "text-base", height: 48 },
  lg: { padding: "py-5 px-8", text: "text-lg", height: 56 },
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
      activeOpacity={0.7}
      className={`
        ${style.bg} 
        ${sizeStyle.padding}
        rounded-2xl
        ${fullWidth ? "w-full" : ""}
        ${disabled ? "opacity-50" : ""}
        flex-row items-center justify-center
      `}
      style={{ minHeight: sizeStyle.height }}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? "#e8e8e8" : "#ffffff"} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text style={{ fontFamily: "Nunito_700Bold" }} className={`${style.text} ${sizeStyle.text}`}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Simple Button alias
export const Button = GradientButton;
