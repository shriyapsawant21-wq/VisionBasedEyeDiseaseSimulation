import { StatusBar } from "expo-status-bar";
import { RelayConnectorProvider } from "./src/RelayConnectorContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <RelayConnectorProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </RelayConnectorProvider>
  );
}
