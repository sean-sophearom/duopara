import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Platform } from "react-native";

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  size: number;
}

function TabIcon({ name, color, focused, size }: TabIconProps) {
  return (
    <View className="items-center justify-center" style={{ paddingTop: 2 }}>
      <Ionicons
        name={focused ? name.replace("-outline", "") as any : name}
        size={22}
        color={color}
      />
      {focused && (
        <View
          className="rounded-full mt-1"
          style={{
            width: 4,
            height: 4,
            backgroundColor: color,
          }}
        />
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#58cc02",
        tabBarInactiveTintColor: "#555555",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Nunito_600SemiBold",
          marginTop: 0,
        },
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          backgroundColor: "#1a1a1a",
          borderTopWidth: 1,
          borderTopColor: "#252525",
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingTop: 4,
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
