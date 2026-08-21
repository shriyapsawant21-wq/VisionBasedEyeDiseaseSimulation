import { useEffect } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PairingScreen } from "../screens/PairingScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ConnectionLostScreen } from "../screens/ConnectionLostScreen";
import { useRelayConnector } from "../useRelayConnector";

export type RootStackParamList = {
  Pairing: undefined;
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
 */
function StatusRouter() {
  const { status } = useRelayConnector();

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    if (status === "paired") {
      navigationRef.reset({ index: 0, routes: [{ name: "Dashboard" }] });
    } else if (status === "sessionLost") {
      navigationRef.reset({ index: 0, routes: [{ name: "ConnectionLost" }] });
    } else if (status === "disconnected") {
      navigationRef.reset({ index: 0, routes: [{ name: "Pairing" }] });
    }
  }, [status]);

  return null;
}

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Pairing" component={PairingScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="ConnectionLost" component={ConnectionLostScreen} />
      </Stack.Navigator>
      <StatusRouter />
    </NavigationContainer>
  );
}
