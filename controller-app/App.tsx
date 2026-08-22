import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RelayConnectorProvider } from "./src/RelayConnectorContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    // React Navigation's tab bar sizes itself from safe-area insets; without
    // this provider it renders behind Android's system navigation bar and the
    // tabs cannot be tapped.
    <SafeAreaProvider>
      <RelayConnectorProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </RelayConnectorProvider>
    </SafeAreaProvider>
  );
}
