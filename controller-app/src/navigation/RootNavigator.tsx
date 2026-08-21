import { useEffect } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SplashScreen } from "../screens/SplashScreen";
import { PairingScreen } from "../screens/PairingScreen";
import { QrScanScreen } from "../screens/QrScanScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ConnectionLostScreen } from "../screens/ConnectionLostScreen";
import { useRelayConnector } from "../useRelayConnector";

export type RootStackParamList = {
  Splash: undefined;
  Pairing: undefined;
  QrScan: undefined;
  Dashboard: undefined;
  ConnectionLost: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Dashboard is the persistent home screen - Pairing/QrScan are actions the
 * user reaches from Dashboard's options panel, not a gate before it. This
 * only reacts to the two events that should force a navigation regardless
 * of what screen is currently open: successfully pairing (wherever that
 * was triggered from) snaps back to Dashboard, and an unexpected drop of
 * an active pairing shows ConnectionLost. Plain "disconnected" is not
 * handled here - Dashboard is where you land normally, no reset needed.
 */
function StatusRouter() {
  const { status } = useRelayConnector();

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    if (status === "paired") {
      navigationRef.reset({ index: 0, routes: [{ name: "Dashboard" }] });
    } else if (status === "sessionLost") {
      navigationRef.reset({ index: 0, routes: [{ name: "ConnectionLost" }] });
    }
  }, [status]);

  return null;
}

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Pairing" component={PairingScreen} />
        <Stack.Screen name="QrScan" component={QrScanScreen} />
        <Stack.Screen name="ConnectionLost" component={ConnectionLostScreen} />
      </Stack.Navigator>
      <StatusRouter />
    </NavigationContainer>
  );
}
