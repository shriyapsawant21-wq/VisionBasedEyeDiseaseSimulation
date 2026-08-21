import { Button, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useRelayConnector } from "../useRelayConnector";

type Props = NativeStackScreenProps<RootStackParamList, "ConnectionLost">;

/**
 * Shown when a session that was paired drops - either the simulation
 * device disconnected (relay resets the room per relay/src/index.ts's
 * close handler) or the socket itself closed. Dashboard is the resting
 * screen now, so "back" here means returning to it directly (StatusRouter
 * only reacts to "paired"/"sessionLost", not plain "disconnected").
 */
export function ConnectionLostScreen({ navigation }: Props) {
  const { lastError, disconnect } = useRelayConnector();

  function handleBack() {
    disconnect();
    navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
  }

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
      <Button title="Back to Dashboard" onPress={handleBack} />
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
