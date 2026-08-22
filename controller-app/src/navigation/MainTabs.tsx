import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { DashboardScreen } from "../screens/DashboardScreen";
import { SymptomListScreen } from "../screens/SymptomListScreen";
import { colors } from "../theme";

export type MainTabsParamList = {
  Disease: undefined;
  Symptoms: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const TAB_ICONS: Record<keyof MainTabsParamList, string> = {
  Disease: "◆",
  Symptoms: "◈",
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.sand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.charcoal, borderTopWidth: 0 },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 16 }}>{TAB_ICONS[route.name as keyof MainTabsParamList]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Disease" component={DashboardScreen} />
      <Tab.Screen name="Symptoms" component={SymptomListScreen} />
    </Tab.Navigator>
  );
}
