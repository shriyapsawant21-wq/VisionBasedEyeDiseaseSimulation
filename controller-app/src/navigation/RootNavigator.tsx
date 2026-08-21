import { useEffect } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SplashScreen } from "../screens/SplashScreen";
import { DisclaimerScreen } from "../screens/DisclaimerScreen";
import { RoleSelectionScreen } from "../screens/RoleSelectionScreen";
import { PairingScreen } from "../screens/PairingScreen";
import { ConnectionLostScreen } from "../screens/ConnectionLostScreen";
import { MainTabs } from "./MainTabs";
import { useRelayConnector } from "../useRelayConnector";

export type RootStackParamList = {
  Splash: undefined;
  Disclaimer: undefined;
  RoleSelection: undefined;
  MainTabs: undefined;
  Pairing: undefined;
  ConnectionLost: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Dashboard (inside MainTabs) is the persistent home screen once onboarding
 * is done - Pairing (QR scan + manual entry combined) is an action reached
 * from its options panel, not a gate before it. This only reacts to the two
 * events that should force a
 * navigation regardless of what screen is open: successfully pairing snaps
 * back to the Dashboard tab, and an unexpected drop of an active pairing
 * shows ConnectionLost.
 */
function StatusRouter() {
  const { status } = useRelayConnector();

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    if (status === "paired") {
      navigationRef.reset({ index: 0, routes: [{ name: "MainTabs" }] });
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
        <Stack.Screen name="Disclaimer" component={DisclaimerScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Pairing" component={PairingScreen} />
        <Stack.Screen name="ConnectionLost" component={ConnectionLostScreen} />
      </Stack.Navigator>
      <StatusRouter />
    </NavigationContainer>
  );
}
