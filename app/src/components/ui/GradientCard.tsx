import { View, ViewProps, Text } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function GradientCard({
  children,
  className = "",
  noPadding = false,
  ...props
}: CardProps) {
  return (
    <View
      className={`bg-owl-100 rounded-2xl ${noPadding ? "" : "p-5"} ${className}`}
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
  iconBg = "bg-owl-200",
  value,
  label,
  trend,
  trendValue,
}: StatCardProps) {
  return (
    <View className="bg-owl-100 rounded-2xl p-5 flex-1 min-w-[45%]">
      <View className={`w-10 h-10 rounded-xl ${iconBg} items-center justify-center mb-3`}>
        {icon}
      </View>
      <View className="flex-row items-baseline">
        <Text style={{ fontFamily: "Nunito_700Bold" }} className="text-2xl text-owl-800">{value}</Text>
        {trend && trendValue && (
          <View className={`ml-2 px-2 py-0.5 rounded-full ${trend === "up" ? "bg-primary-200" : "bg-danger-200"}`}>
            <Text style={{ fontFamily: "Nunito_600SemiBold" }} className={`text-xs ${trend === "up" ? "text-primary-600" : "text-danger-600"}`}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>
      <Text style={{ fontFamily: "Nunito_400Regular" }} className="text-sm text-owl-500 mt-1">{label}</Text>
    </View>
  );
}
