import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ActionCardProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary" | "warning" | "danger";
  badge?: string | number;
}

const variants = {
  primary: { bg: "bg-primary-500", iconBg: "bg-primary-400" },
  secondary: { bg: "bg-secondary-500", iconBg: "bg-secondary-400" },
  warning: { bg: "bg-warning-500", iconBg: "bg-warning-400" },
  danger: { bg: "bg-danger-500", iconBg: "bg-danger-400" },
};

export function ActionCard({
  title,
  subtitle,
  icon,
  onPress,
  variant = "primary",
  badge,
}: ActionCardProps) {
  const style = variants[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`${style.bg} rounded-xl p-4 flex-1 min-w-[45%] border-b-4 border-b-black/10`}
    >
      {badge !== undefined && (
        <View className="absolute -top-2 -right-2 bg-white rounded-full px-2 py-0.5 shadow">
          <Text className="text-xs font-bold text-owl-800">{badge}</Text>
        </View>
      )}
      <View className={`w-10 h-10 rounded-lg ${style.iconBg} items-center justify-center mb-2`}>
        <Ionicons name={icon} size={22} color="#ffffff" />
      </View>
      <Text className="text-white font-bold text-base">{title}</Text>
      {subtitle && (
        <Text className="text-white/80 text-sm mt-0.5">{subtitle}</Text>
      )}
    </TouchableOpacity>
  );
}

interface NotificationCardProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: "info" | "success" | "warning" | "danger";
}

const notificationStyles = {
  info: { bg: "bg-secondary-100", border: "border-secondary-400", icon: "#1cb0f6", text: "text-secondary-800" },
  success: { bg: "bg-primary-100", border: "border-primary-400", icon: "#58cc02", text: "text-primary-800" },
  warning: { bg: "bg-warning-100", border: "border-warning-400", icon: "#ffc800", text: "text-warning-800" },
  danger: { bg: "bg-danger-100", border: "border-danger-400", icon: "#ff4b4b", text: "text-danger-800" },
};

export function NotificationCard({
  title,
  subtitle,
  icon,
  onPress,
  variant = "info",
}: NotificationCardProps) {
  const style = notificationStyles[variant];

  const Content = (
    <View className={`${style.bg} rounded-xl p-4 flex-row items-center border-l-4 ${style.border}`}>
      <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color={style.icon} />
      </View>
      <View className="flex-1">
        <Text className={`font-bold ${style.text}`}>{title}</Text>
        {subtitle && (
          <Text className={`text-sm ${style.text} opacity-80 mt-0.5`}>{subtitle}</Text>
        )}
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color={style.icon} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
}
