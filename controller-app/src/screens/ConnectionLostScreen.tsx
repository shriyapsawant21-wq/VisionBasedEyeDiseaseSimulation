import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useRelayConnector } from "../useRelayConnector";
import { colors, spacing, type } from "../theme";

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
      <Text style={styles.heading}>Connection Lost</Text>
      {lastError ? (
        <Text style={styles.error}>
          {lastError.code}: {lastError.message}
        </Text>
      ) : (
        <Text style={styles.body}>The paired device disconnected or the connection dropped.</Text>
      )}
      <Pressable style={styles.button} onPress={handleBack}>
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.charcoal,
  },
  heading: {
    ...type.title,
    color: colors.textOnDark,
  },
  body: {
    ...type.body,
    color: colors.sand,
    textAlign: "center",
  },
  error: {
    ...type.body,
    color: colors.coral,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    ...type.button,
    color: colors.white,
  },
});
