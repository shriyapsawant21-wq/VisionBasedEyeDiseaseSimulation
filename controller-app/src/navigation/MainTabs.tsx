import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { DashboardScreen } from "../screens/DashboardScreen";
import { EducationScreen } from "../screens/EducationScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { colors } from "../theme";

export type MainTabsParamList = {
  Dashboard: undefined;
  Education: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const TAB_ICONS: Record<keyof MainTabsParamList, string> = {
  Dashboard: "◆",
  Education: "◈",
  Settings: "◇",
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.charcoal, borderTopWidth: 0 },
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>{TAB_ICONS[route.name as keyof MainTabsParamList]}</Text>,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Education" component={EducationScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
