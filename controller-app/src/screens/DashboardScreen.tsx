import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { MainTabsParamList } from "../navigation/MainTabs";
import { useRelayConnector } from "../useRelayConnector";
import { DISEASE_INFO, DISEASE_ORDER, FLOATER_TYPES } from "../diseaseInfo";
import { OptionsButton } from "../components/OptionsButton";
import { SidePanel } from "../components/SidePanel";
import type { Comparison } from "../../../relay/src/protocol";
import { colors, spacing, type } from "../theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, "Dashboard">,
  NativeStackScreenProps<RootStackParamList>
>;

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
          <Text style={styles.appName}>VisionSim VR</Text>
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

        <Text style={styles.sectionLabel}>Diagnostic Profile</Text>
        <View style={styles.row}>
          {DISEASE_ORDER.map((disease) => {
            const info = DISEASE_INFO[disease];
            const active = disease === activeDisease;
            return (
              <Pressable
                key={disease}
                style={[styles.chip, active && styles.chipActive, !paired && styles.disabled]}
                disabled={!paired}
                onPress={() => setDisease(disease)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{info.shortLabel}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.profileTitle}>{activeInfo.clinicalLabel}</Text>
          <Text style={styles.profileBody}>{activeInfo.description}</Text>
        </View>

        <Text style={styles.sectionLabel}>Severity</Text>
        <View style={styles.severitySection}>
          <Text style={styles.severityValue}>{Math.round(localSeverity * 100)}%</Text>
          <Slider
            minimumValue={0}
            maximumValue={1}
            value={localSeverity}
            onValueChange={setLocalSeverity}
            onSlidingComplete={setSeverity}
            disabled={!paired}
            minimumTrackTintColor={colors.coral}
            thumbTintColor={colors.coral}
          />
          <View style={styles.row}>
            {(Object.keys(SEVERITY_PRESETS) as Array<keyof typeof SEVERITY_PRESETS>).map((preset) => (
              <Pressable
                key={preset}
                style={[styles.presetButton, !paired && styles.disabled]}
                disabled={!paired}
                onPress={() => {
                  const value = SEVERITY_PRESETS[preset];
                  setLocalSeverity(value);
                  setSeverity(value);
                }}
              >
                <Text style={styles.presetButtonText}>{preset}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Vision Mode</Text>
        <View style={styles.segmented}>
          {COMPARISONS.map((comparison) => {
            const active = comparison === activeComparison;
            return (
              <Pressable
                key={comparison}
                style={[styles.segment, active && styles.segmentActive, !paired && styles.disabled]}
                disabled={!paired}
                onPress={() => setComparison(comparison)}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{comparison}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Progression</Text>
        <View style={styles.progressionSection}>
          <Text style={styles.timelineTime}>
            {formatTime(elapsed)} / {formatTime(PROGRESSION_TOTAL_SECONDS)}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(elapsed / PROGRESSION_TOTAL_SECONDS) * 100}%` }]} />
          </View>
          <View style={styles.row}>
            <Pressable
              style={[styles.textButton, (!paired || isRunning) && styles.disabled]}
              disabled={!paired || isRunning}
              onPress={handlePlay}
            >
              <Text style={styles.textButtonLabel}>Play</Text>
            </Pressable>
            <Pressable
              style={[styles.textButton, (!paired || !isRunning) && styles.disabled]}
              disabled={!paired || !isRunning}
              onPress={handlePause}
            >
              <Text style={styles.textButtonLabel}>Pause</Text>
            </Pressable>
            <Pressable style={[styles.textButton, !paired && styles.disabled]} disabled={!paired} onPress={handleTimelineReset}>
              <Text style={styles.textButtonLabel}>Reset</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <Pressable style={[styles.quickAction, !paired && styles.disabled]} disabled={!paired} onPress={() => recenter()}>
          <Text style={styles.quickActionText}>Recenter View</Text>
        </Pressable>
        <Pressable
          style={[styles.quickActionSafety, !paired && styles.disabled]}
          disabled={!paired}
          onPress={() => reset()}
        >
          <Text style={styles.quickActionSafetyText}>Reset to Normal</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Floaters Reference</Text>
        <View style={styles.floaterSection}>
          {FLOATER_TYPES.map((f) => (
            <Text key={f.source} style={styles.floaterLine}>
              <Text style={styles.floaterSource}>{f.source}</Text> — {f.description}
            </Text>
          ))}
        </View>

        <View style={styles.spacer} />
        {paired &&
          (confirmingEnd ? (
            <View style={styles.row}>
              <Pressable style={styles.quickActionSafety} onPress={() => {
                endSession();
                setConfirmingEnd(false);
                disconnect();
              }}>
                <Text style={styles.quickActionSafetyText}>Confirm end session</Text>
              </Pressable>
              <Pressable style={styles.textButton} onPress={() => setConfirmingEnd(false)}>
                <Text style={styles.textButtonLabel}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.textButton} onPress={() => setConfirmingEnd(true)}>
              <Text style={styles.textButtonLabel}>End session</Text>
            </Pressable>
          ))}
      </ScrollView>

      <SidePanel visible={panelOpen} onClose={() => setPanelOpen(false)}>
        <Text style={styles.panelTitle}>Options</Text>
        {paired ? (
          <Pressable
            style={styles.textButton}
            onPress={() => {
              setPanelOpen(false);
              disconnect();
            }}
          >
            <Text style={styles.textButtonLabel}>Disconnect</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.textButton}
            onPress={() => {
              setPanelOpen(false);
              navigation.navigate("Pairing");
            }}
          >
            <Text style={styles.textButtonLabel}>Connect / Pair</Text>
          </Pressable>
        )}
      </SidePanel>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.charcoal,
  },
  appName: {
    ...type.value,
    color: colors.textOnDark,
  },
  statusLine: {
    ...type.body,
    fontSize: 13,
    color: colors.sand,
  },
  statusLinePaired: {
    color: colors.teal,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  disabled: {
    opacity: 0.4,
  },
  chipText: {
    ...type.button,
    color: colors.textOnLight,
  },
  chipTextActive: {
    color: colors.textOnDark,
  },
  profileSection: {
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.sandLight,
  },
  profileTitle: {
    ...type.value,
    fontSize: 18,
    color: colors.textOnLight,
  },
  profileBody: {
    ...type.body,
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  severitySection: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  severityValue: {
    ...type.title,
    fontSize: 32,
    color: colors.coral,
  },
  presetButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  presetButtonText: {
    ...type.button,
    color: colors.textOnLight,
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.teal,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.teal,
  },
  segmentText: {
    ...type.button,
    color: colors.teal,
  },
  segmentTextActive: {
    color: colors.textOnDark,
  },
  progressionSection: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  timelineTime: {
    ...type.value,
    fontVariant: ["tabular-nums"],
    color: colors.textOnLight,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.coral,
  },
  textButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.charcoal,
  },
  textButtonLabel: {
    ...type.button,
    color: colors.charcoal,
  },
  quickAction: {
    backgroundColor: colors.charcoal,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  quickActionText: {
    ...type.button,
    color: colors.textOnDark,
  },
  quickActionSafety: {
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  quickActionSafetyText: {
    ...type.button,
    color: colors.white,
  },
  floaterSection: {
    padding: spacing.lg,
    backgroundColor: colors.sandLight,
    gap: spacing.xs,
  },
  floaterLine: {
    ...type.body,
    color: colors.textMuted,
  },
  floaterSource: {
    fontWeight: "700",
    color: colors.textOnLight,
  },
  error: {
    marginTop: spacing.sm,
    color: colors.coral,
  },
  spacer: {
    height: spacing.lg,
  },
  panelTitle: {
    ...type.value,
    color: colors.textOnLight,
  },
});
