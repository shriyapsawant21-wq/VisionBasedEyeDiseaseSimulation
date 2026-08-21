import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useRelayConnector } from "../useRelayConnector";
import { DISEASE_INFO } from "../diseaseInfo";
import type { Comparison } from "../../../relay/src/protocol";
import { colors, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "DiseaseControl">;

const COMPARISONS: Comparison[] = ["NORMAL", "AFFECTED"];
const SEVERITY_PRESETS = { Mild: 0.25, Moderate: 0.55, Severe: 0.85 };

/**
 * Every control for one condition. Reached by tapping a disease on the
 * Dashboard list, which also pushes SET_DISEASE so the headset is already
 * on this condition by the time the screen opens. Controls are disabled
 * until paired - the relay rejects them anyway, this just avoids dead taps.
 * Scene switching is intentionally omitted: SceneEnum only has "GARDEN".
 */
export function DiseaseControlScreen({ route, navigation }: Props) {
  const { disease } = route.params;
  const info = DISEASE_INFO[disease];

  const { status, controllerState, lastError, setSeverity, setComparison, endSession, disconnect } =
    useRelayConnector();

  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [localSeverity, setLocalSeverity] = useState(controllerState?.severity ?? 0.25);

  const paired = status === "paired";
  const activeComparison = controllerState?.comparison ?? "NORMAL";

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{info.shortLabel}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {lastError ? (
          <Text style={styles.error}>
            {lastError.code}: {lastError.message}
          </Text>
        ) : null}

        <Text style={styles.symptomName}>{info.symptomName}</Text>

        <Text style={styles.sectionLabel}>Severity</Text>
        <View style={styles.section}>
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

        <View style={styles.spacer} />
        {paired &&
          (confirmingEnd ? (
            <View style={styles.row}>
              <Pressable
                style={styles.endConfirm}
                onPress={() => {
                  endSession();
                  setConfirmingEnd(false);
                  disconnect();
                }}
              >
                <Text style={styles.endConfirmText}>Confirm end session</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.offWhiteDeep,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.charcoal,
  },
  backLabel: {
    ...type.button,
    color: colors.sand,
  },
  headerTitle: {
    ...type.value,
    color: colors.textOnDark,
  },
  container: {
    padding: spacing.lg,
  },
  symptomName: {
    ...type.title,
    fontSize: 22,
    color: colors.textOnLight,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.4,
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
  endConfirm: {
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  endConfirmText: {
    ...type.button,
    color: colors.white,
  },
  error: {
    marginBottom: spacing.sm,
    color: colors.coral,
  },
  spacer: {
    height: spacing.lg,
  },
});
