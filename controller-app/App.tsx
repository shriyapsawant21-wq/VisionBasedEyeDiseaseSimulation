import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { RelayConnectorProvider } from "./src/RelayConnectorContext";
import { useRelayConnector } from "./src/useRelayConnector";

// Phase 1 verification screen: no real UI yet, just proves the connector
// reaches a real relay and can complete a pairing handshake. Replaced by
// the actual Pairing/Dashboard screens in Phase 2.
const RELAY_URL = "ws://localhost:8787";
const SESSION_ID = "TQV86N";
const PAIRING_TOKEN = "B3AmcrqNJhcq-23brfoZmOiFt1gIDqqw";

function VerificationScreen() {
  const { status, sessionId, controllerState, lastError, connect, pairRequest, setSeverity } = useRelayConnector();

  useEffect(() => {
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("[controller] status", status);
    if (status === "connected") {
      pairRequest(SESSION_ID, PAIRING_TOKEN);
    }
    if (status === "paired") {
      setSeverity(0.42);
    }
  }, [status]);

  useEffect(() => {
    if (controllerState) console.log("[controller] state", controllerState);
  }, [controllerState]);

  useEffect(() => {
    if (lastError) console.log("[controller] error", lastError);
  }, [lastError]);

  return (
    <View style={styles.container}>
      <Text>status: {status}</Text>
      <Text>sessionId: {sessionId ?? "-"}</Text>
      <Text>state: {controllerState ? JSON.stringify(controllerState) : "-"}</Text>
      <Text>error: {lastError ? `${lastError.code}: ${lastError.message}` : "-"}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <RelayConnectorProvider relayUrl={RELAY_URL}>
      <VerificationScreen />
    </RelayConnectorProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
