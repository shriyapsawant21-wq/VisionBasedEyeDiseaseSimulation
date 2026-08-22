import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useRelayConnector } from "../useRelayConnector";
import { CircularSlider } from "../components/CircularSlider";
import { DISEASE_INFO, ALL_ENTRIES } from "../diseaseInfo";
import type { Comparison, Disease } from "../../../relay/src/protocol";
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
  const { status, controllerState, lastError, setDisease, setSeverity, setComparison, endSession, disconnect } =
    useRelayConnector();

  const [activeDisease, setActiveDisease] = useState<Disease>(route.params.disease);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [localSeverity, setLocalSeverity] = useState(controllerState?.severity ?? 0.25);

  const info = DISEASE_INFO[activeDisease];
  // Several disease cards expose multiple simulated symptom variants.
  const entry = ALL_ENTRIES.find((e) => e.variants.includes(activeDisease));
  const variants = entry?.variants ?? [activeDisease];
  const inertVariants = entry?.inertVariants ?? [];
  const showChips = variants.length + inertVariants.length > 1;

  const paired = status === "paired";
  const activeComparison = controllerState?.comparison ?? "NORMAL";

  function handleVariant(next: Disease) {
    setActiveDisease(next);
    if (paired) setDisease(next);
  }

  // Unity only enables an effect once severity clears zero, so selecting a
  // condition alone leaves the headset unchanged. Push the severity the
  // slider is already showing whenever the selection changes (or when the
  // session pairs later) so the simulation actually starts at that value.
  useEffect(() => {
    if (paired) setSeverity(localSeverity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDisease, paired]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {info.shortLabel}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {lastError ? (
          <Text style={styles.error}>
            {lastError.code}: {lastError.message}
          </Text>
        ) : null}

        {/* with variants the chips already name the symptom, so a heading
            would just repeat whichever one is selected */}
        {showChips ? (
          <View style={styles.variantRow}>
            {variants.map((variant) => {
              const active = variant === activeDisease;
              return (
                <Pressable
                  key={variant}
                  style={[styles.variantChip, active && styles.variantChipActive]}
                  onPress={() => handleVariant(variant)}
                >
                  <Text style={[styles.variantChipText, active && styles.variantChipTextActive]}>
                    {DISEASE_INFO[variant].symptomName}
                  </Text>
                </Pressable>
              );
            })}
            {inertVariants.map((name) => (
              <View key={name} style={[styles.variantChip, styles.variantChipInert]}>
                <Text style={styles.variantChipText}>{name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.symptomName}>{info.symptomName}</Text>
        )}

        <Text style={styles.sectionLabel}>{info.severityLabel}</Text>
        <View style={styles.section}>
          <CircularSlider
            value={localSeverity}
            onValueChange={setLocalSeverity}
            onSlidingComplete={setSeverity}
            disabled={!paired}
            label={info.severityLabel}
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
    flex: 1,
    textAlign: "center",
    marginHorizontal: spacing.sm,
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
  variantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  variantChip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  variantChipActive: {
    backgroundColor: colors.deepRed,
    borderColor: colors.deepRed,
  },
  variantChipInert: {
    opacity: 0.45,
  },
  variantChipText: {
    ...type.button,
    color: colors.charcoal,
  },
  variantChipTextActive: {
    color: colors.offWhite,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.4,
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
