import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../src/lib/theme";

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  size: number;
  badge?: number;
}

function TabIcon({ name, color, focused, size, badge }: TabIconProps) {
  return (
    <View className="items-center justify-center" style={{ paddingTop: 2 }}>
      <View>
        <Ionicons
          name={focused ? name.replace("-outline", "") as any : name}
          size={24}
          color={color}
        />
        {badge !== undefined && badge > 0 && (
          <View
            className="absolute -top-1 -right-2 rounded-full items-center justify-center"
            style={{ backgroundColor: "#ff4b4b", minWidth: 16, height: 16, paddingHorizontal: 3 }}
          >
            <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 9, color: "#fff" }}>
              {badge > 99 ? "99+" : badge}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: colors.owl400,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Nunito_700Bold",
          marginTop: 0,
        },
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 56 + insets.bottom,
          backgroundColor: colors.owl100,
          borderTopWidth: 1,
          borderTopColor: colors.owl200,
          paddingTop: 4,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="sparkles-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="book-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: "Words",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="library-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "Practice",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="school-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="person-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
