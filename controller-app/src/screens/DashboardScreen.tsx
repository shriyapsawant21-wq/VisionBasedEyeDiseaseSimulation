import { useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRelayConnector } from "../useRelayConnector";
import type { Disease, Comparison } from "../../../relay/src/protocol";

const DISEASES: Disease[] = ["METAMORPHOPSIA", "CENTRAL_BLUR", "TUNNEL_VISION"];
const COMPARISONS: Comparison[] = ["NORMAL", "AFFECTED"];
const SEVERITY_STEPS = [0, 0.25, 0.5, 0.75, 1];

/**
 * Unstyled placeholder for Phase 2 - every CONTROLLER_ONLY_TYPES command
 * wired to a button so the state machine is provable end-to-end. Real
 * layout (sliders, toggles, etc.) lands in Phase 3 against the mockup.
 * Scene switching is intentionally omitted: SceneEnum only has "GARDEN"
 * right now, so there's nothing to switch between yet.
 */
export function DashboardScreen() {
  const {
    sessionId,
    controllerState,
    lastError,
    setDisease,
    setSeverity,
    setComparison,
    startProgression,
    pauseProgression,
    recenter,
    reset,
    endSession,
    disconnect,
  } = useRelayConnector();
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Paired: {sessionId}</Text>
      <Text>current state: {controllerState ? JSON.stringify(controllerState) : "waiting for update..."}</Text>
      {lastError ? (
        <Text style={styles.error}>
          {lastError.code}: {lastError.message}
        </Text>
      ) : null}

      <Text style={styles.section}>Disease</Text>
      <View style={styles.row}>
        {DISEASES.map((disease) => (
          <Button key={disease} title={disease} onPress={() => setDisease(disease)} />
        ))}
      </View>

      <Text style={styles.section}>Severity</Text>
      <View style={styles.row}>
        {SEVERITY_STEPS.map((severity) => (
          <Button key={severity} title={String(severity)} onPress={() => setSeverity(severity)} />
        ))}
      </View>

      <Text style={styles.section}>Comparison</Text>
      <View style={styles.row}>
        {COMPARISONS.map((comparison) => (
          <Button key={comparison} title={comparison} onPress={() => setComparison(comparison)} />
        ))}
      </View>

      <Text style={styles.section}>Progression</Text>
      <View style={styles.row}>
        <Button title="Start (60s)" onPress={() => startProgression(60)} />
        <Button title="Pause" onPress={() => pauseProgression()} />
      </View>

      <Text style={styles.section}>Session</Text>
      <View style={styles.row}>
        <Button title="Recenter" onPress={() => recenter()} />
        <Button title="Reset" onPress={() => reset()} />
      </View>

      {confirmingEnd ? (
        <View style={styles.row}>
          <Button
            title="Confirm end session"
            color="red"
            onPress={() => {
              endSession();
              setConfirmingEnd(false);
              disconnect();
            }}
          />
          <Button title="Cancel" onPress={() => setConfirmingEnd(false)} />
        </View>
      ) : (
        <Button title="End session" onPress={() => setConfirmingEnd(true)} />
      )}

      <View style={styles.spacer} />
      <Button title="Disconnect" onPress={() => disconnect()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 4,
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
  },
  section: {
    marginTop: 16,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  error: {
    marginTop: 8,
    color: "red",
  },
  spacer: {
    height: 24,
  },
});
