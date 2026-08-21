import { useEffect, useRef, useState } from "react";
import { Button, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useRelayConnector } from "../useRelayConnector";
import { DISEASE_INFO, DISEASE_ORDER, FLOATER_TYPES } from "../diseaseInfo";
import { OptionsButton } from "../components/OptionsButton";
import { SidePanel } from "../components/SidePanel";
import type { Comparison } from "../../../relay/src/protocol";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

const COMPARISONS: Comparison[] = ["NORMAL", "AFFECTED"];
const SEVERITY_PRESETS = { Mild: 0.25, Moderate: 0.55, Severe: 0.85 };
// relay/src/protocol.ts caps START_PROGRESSION at 600s (10 min)
const PROGRESSION_TOTAL_SECONDS = 300;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function statusLabel(status: string, sessionId: string | null): string {
  switch (status) {
    case "paired":
      return `Connected · ${sessionId}`;
    case "connected":
      return "Connected, pairing...";
    case "connecting":
      return "Connecting...";
    default:
      return "Not connected";
  }
}

/**
 * Dashboard is the app's persistent home screen (not gated behind pairing).
 * Controls that require a paired session are disabled until status is
 * "paired" - pressing them earlier would just get a "not_paired" error
 * back from the relay, so disabling is purely a UX nicety, not a safety
 * requirement (relay already rejects the message either way). Scene
 * switching is intentionally omitted: SceneEnum only has "GARDEN" right
 * now, so there's nothing to switch between yet.
 */
export function DashboardScreen({ navigation }: Props) {
  const {
    status,
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

  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [localSeverity, setLocalSeverity] = useState(controllerState?.severity ?? 0.25);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const paired = status === "paired";
  const activeDisease = controllerState?.disease ?? "CENTRAL_BLUR";
  const activeComparison = controllerState?.comparison ?? "NORMAL";
  const activeInfo = DISEASE_INFO[activeDisease];

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= PROGRESSION_TOTAL_SECONDS) {
            setIsRunning(false);
            return PROGRESSION_TOTAL_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  function handlePlay() {
    startProgression(PROGRESSION_TOTAL_SECONDS - elapsed);
    setIsRunning(true);
  }

  function handlePause() {
    pauseProgression();
    setIsRunning(false);
  }

  function handleTimelineReset() {
    pauseProgression();
    setIsRunning(false);
    setElapsed(0);
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>VisionBridge</Text>
          <Text style={[styles.statusLine, paired && styles.statusLinePaired]}>
            {statusLabel(status, sessionId)}
          </Text>
        </View>
        <OptionsButton onPress={() => setPanelOpen(true)} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {lastError ? (
          <Text style={styles.error}>
            {lastError.code}: {lastError.message}
          </Text>
        ) : null}

        <Text style={styles.section}>Diagnostic Profile</Text>
        <View style={styles.row}>
          {DISEASE_ORDER.map((disease) => {
            const info = DISEASE_INFO[disease];
            const active = disease === activeDisease;
            return (
              <Pressable
                key={disease}
                style={[styles.chip, active && styles.chipActive, !paired && styles.chipDisabled]}
                disabled={!paired}
                onPress={() => setDisease(disease)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{info.shortLabel}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{activeInfo.clinicalLabel}</Text>
          <Text style={styles.cardBody}>{activeInfo.description}</Text>
        </View>

        <Text style={styles.section}>Severity</Text>
        <View style={styles.severityBarTrack}>
          <View style={[styles.severityBarFill, { width: `${Math.round(localSeverity * 100)}%` }]} />
        </View>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={localSeverity}
          onValueChange={setLocalSeverity}
          onSlidingComplete={setSeverity}
          disabled={!paired}
        />
        <View style={styles.row}>
          {(Object.keys(SEVERITY_PRESETS) as Array<keyof typeof SEVERITY_PRESETS>).map((preset) => (
            <Button
              key={preset}
              title={preset}
              disabled={!paired}
              onPress={() => {
                const value = SEVERITY_PRESETS[preset];
                setLocalSeverity(value);
                setSeverity(value);
              }}
            />
          ))}
        </View>

        <Text style={styles.section}>Vision Mode</Text>
        <View style={styles.row}>
          {COMPARISONS.map((comparison) => {
            const active = comparison === activeComparison;
            return (
              <Pressable
                key={comparison}
                style={[styles.chip, active && styles.chipActive, !paired && styles.chipDisabled]}
                disabled={!paired}
                onPress={() => setComparison(comparison)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{comparison}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Progression Timeline</Text>
        <Text style={styles.timelineTime}>
          {formatTime(elapsed)} / {formatTime(PROGRESSION_TOTAL_SECONDS)}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(elapsed / PROGRESSION_TOTAL_SECONDS) * 100}%` }]} />
        </View>
        <View style={styles.row}>
          <Button title="Play" onPress={handlePlay} disabled={!paired || isRunning} />
          <Button title="Pause" onPress={handlePause} disabled={!paired || !isRunning} />
          <Button title="Reset" onPress={handleTimelineReset} disabled={!paired} />
        </View>

        <View style={styles.row}>
          <Button title="Recenter View" onPress={() => recenter()} disabled={!paired} />
        </View>
        <View style={styles.row}>
          <Button title="Reset to Normal" color="#c0392b" onPress={() => reset()} disabled={!paired} />
        </View>

        <Text style={styles.section}>Floaters (reference)</Text>
        {FLOATER_TYPES.map((f) => (
          <View key={f.source} style={styles.floaterRow}>
            <Text style={styles.floaterSource}>{f.source}</Text>
            <Text style={styles.floaterDescription}>{f.description}</Text>
          </View>
        ))}

        <View style={styles.spacer} />
        {paired &&
          (confirmingEnd ? (
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
          ))}
      </ScrollView>

      <SidePanel visible={panelOpen} onClose={() => setPanelOpen(false)}>
        <Text style={styles.panelTitle}>Options</Text>
        {paired ? (
          <Button
            title="Disconnect"
            onPress={() => {
              setPanelOpen(false);
              disconnect();
            }}
          />
        ) : (
          <>
            <Button
              title="Scan QR Code"
              onPress={() => {
                setPanelOpen(false);
                navigation.navigate("QrScan");
              }}
            />
            <Button
              title="Enter Pairing Code"
              onPress={() => {
                setPanelOpen(false);
                navigation.navigate("Pairing");
              }}
            />
          </>
        )}
      </SidePanel>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  appName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statusLine: {
    color: "#666",
  },
  statusLinePaired: {
    color: "#2e7d32",
  },
  container: {
    padding: 24,
    gap: 4,
  },
  section: {
    marginTop: 20,
    fontWeight: "bold",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: "#1a1a2e",
    borderColor: "#1a1a2e",
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    color: "#1a1a2e",
  },
  chipTextActive: {
    color: "#fff",
  },
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  cardTitle: {
    fontWeight: "bold",
  },
  cardBody: {
    marginTop: 4,
    color: "#444",
  },
  severityBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e0e0e0",
    marginTop: 8,
    overflow: "hidden",
  },
  severityBarFill: {
    height: "100%",
    backgroundColor: "#e67e22",
  },
  timelineTime: {
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e0e0e0",
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3498db",
  },
  floaterRow: {
    marginTop: 8,
  },
  floaterSource: {
    fontWeight: "bold",
  },
  floaterDescription: {
    color: "#444",
  },
  error: {
    marginTop: 8,
    color: "red",
  },
  spacer: {
    height: 24,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
