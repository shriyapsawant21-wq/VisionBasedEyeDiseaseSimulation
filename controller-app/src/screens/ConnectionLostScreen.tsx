import { Button, StyleSheet, Text, View } from "react-native";
import { useRelayConnector } from "../useRelayConnector";

/**
 * Shown when a session that was paired drops - either the simulation
 * device disconnected (relay resets the room per relay/src/index.ts's
 * close handler) or the socket itself closed. Only path forward is back
 * to Pairing; nothing here retries automatically.
 */
export function ConnectionLostScreen() {
  const { lastError, disconnect } = useRelayConnector();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Connection lost</Text>
      {lastError ? (
        <Text style={styles.error}>
          {lastError.code}: {lastError.message}
        </Text>
      ) : (
        <Text>The paired device disconnected or the connection dropped.</Text>
      )}
      <Button title="Back to pairing" onPress={() => disconnect()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
  },
  error: {
    color: "red",
  },
});
