import { View, ViewProps, Text } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

// Simple white card with shadow - Duolingo style
export function GradientCard({
  children,
  className = "",
  noPadding = false,
  ...props
}: CardProps) {
  return (
    <View
      className={`bg-white rounded-xl ${noPadding ? "" : "p-4"} ${className}`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
      {...props}
    >
      {children}
    </View>
  );
}

// Alias for cleaner naming
export const Card = GradientCard;

interface StatCardProps {
  icon: React.ReactNode;
  iconBg?: string;
  value: string | number;
  label: string;
  trend?: "up" | "down";
  trendValue?: string;
}

export function StatCard({
  icon,
  iconBg = "bg-primary-100",
  value,
  label,
  trend,
  trendValue,
}: StatCardProps) {
  return (
    <View
      className="bg-white rounded-xl p-4 flex-1 min-w-[45%]"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className={`w-10 h-10 rounded-xl ${iconBg} items-center justify-center mb-3`}>
        {icon}
      </View>
      <View className="flex-row items-baseline">
        <Text className="text-2xl font-bold text-owl-800">{value}</Text>
        {trend && trendValue && (
          <View className={`ml-2 px-2 py-0.5 rounded-full ${trend === "up" ? "bg-primary-100" : "bg-danger-100"}`}>
            <Text className={`text-xs font-medium ${trend === "up" ? "text-primary-600" : "text-danger-600"}`}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-owl-500 mt-1">{label}</Text>
    </View>
  );
}
