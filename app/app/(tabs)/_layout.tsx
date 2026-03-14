import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { useEffect } from "react";

const AnimatedView = Animated.createAnimatedComponent(View);

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  size: number;
}

function TabIcon({ name, color, focused, size }: TabIconProps) {
  const scale = useSharedValue(focused ? 1.15 : 1);
  const translateY = useSharedValue(focused ? -4 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, { damping: 15, stiffness: 200 });
    translateY.value = withSpring(focused ? -4 : 0, { damping: 15, stiffness: 200 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <AnimatedView style={animatedStyle} className="items-center justify-center">
      {focused && (
        <View
          className="absolute -inset-3 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: `${color}20`,
          }}
        />
      )}
      <Ionicons
        name={focused ? name.replace("-outline", "") as any : name}
        size={size}
        color={color}
      />
    </AnimatedView>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: "#f8fafc",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: "#1e293b",
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 20,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: "#2a94ff",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: -2,
        },
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 24 : 16,
          left: 16,
          right: 16,
          height: 70,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: 28,
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 20,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          borderRadius: 20,
          marginHorizontal: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          headerTitle: "Dashboard",
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
