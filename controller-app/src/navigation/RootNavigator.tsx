import { useEffect, useRef } from "react";
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
 * Drives screen transitions off connector status rather than user taps,
 * since pairing/disconnection happen from relay events, not navigation
 * actions. The "intentional disconnect" vs. "unexpected drop" distinction
 * is made once, in RelayConnectorContext (status "disconnected" vs.
 * "sessionLost") - this just follows status, it doesn't re-decide it.
 *
 * hasEverConnectedRef guards the initial "disconnected" status (true from
 * app launch, before Splash has even handed off to Pairing) from forcing
 * an immediate reset to Pairing and skipping Splash entirely.
 */
function StatusRouter() {
  const { status } = useRelayConnector();
  const hasEverConnectedRef = useRef(false);

  useEffect(() => {
    if (!navigationRef.isReady()) return;
    if (status !== "disconnected") hasEverConnectedRef.current = true;

    if (status === "paired") {
      navigationRef.reset({ index: 0, routes: [{ name: "Dashboard" }] });
    } else if (status === "sessionLost") {
      navigationRef.reset({ index: 0, routes: [{ name: "ConnectionLost" }] });
    } else if (status === "disconnected" && hasEverConnectedRef.current) {
      navigationRef.reset({ index: 0, routes: [{ name: "Pairing" }] });
    }
  }, [status]);

  return null;
}

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Pairing" component={PairingScreen} />
        <Stack.Screen name="QrScan" component={QrScanScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="ConnectionLost" component={ConnectionLostScreen} />
      </Stack.Navigator>
      <StatusRouter />
    </NavigationContainer>
  );
}
