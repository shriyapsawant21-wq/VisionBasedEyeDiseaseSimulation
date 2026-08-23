import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { MainTabsParamList } from "../navigation/MainTabs";
import { useRelayConnector } from "../useRelayConnector";
import { DISEASE_PROGRAMS } from "../diseaseInfo";
import { OptionsButton } from "../components/OptionsButton";
import { SidePanel } from "../components/SidePanel";
import { DiseaseCard } from "../components/DiseaseCard";
import type { Scene } from "../../../relay/src/protocol";
import { colors, radius, spacing, type } from "../theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, "Disease">,
  NativeStackScreenProps<RootStackParamList>
>;

const SCENES: Array<{ value: Scene; label: string }> = [
  { value: "GARDEN", label: "Garden" },
  { value: "HOSPITAL", label: "Hospital" },
];

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
 * Dashboard is the app's persistent home screen (not gated behind pairing)
 * and shows the disease progression programs. Each program is a 30-second
 * auto-play simulation, not a slider-based control.
 */
export function DashboardScreen({ navigation }: Props) {
  const { status, sessionId, lastError, controllerState, setScene, recenter, disconnect } = useRelayConnector();
  const [panelOpen, setPanelOpen] = useState(false);

  const paired = status === "paired";
  // Unity is authoritative on which scene is actually loaded (see
  // RelayCommandBridge.SendCurrentState) - this renders STATE_UPDATED
  // directly rather than tracking an optimistic local choice, same as Vision
  // Mode on the control screen.
  const activeScene = controllerState?.scene ?? "GARDEN";

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>ProVision</Text>
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

        <Text style={styles.sectionLabel}>Background</Text>
        <View style={styles.segmented}>
          {SCENES.map((scene) => {
            const active = scene.value === activeScene;
            return (
              <Pressable
                key={scene.value}
                style={[styles.segment, active && styles.segmentActive, !paired && styles.disabled]}
                disabled={!paired}
                onPress={() => setScene(scene.value)}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{scene.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/*
          Puts the headset's "forward" back where the wearer is actually
          looking - for when the phone was inserted crooked, or the
          background switch above landed with the scene facing the wrong way.
          Unity has no state to reflect here (recentring isn't a mode, it's a
          one-shot correction), so this is a plain action button, not a
          toggle like Background.
        */}
        <Pressable
          style={[styles.adjustButton, !paired && styles.disabled]}
          disabled={!paired}
          onPress={recenter}
        >
          <Text style={styles.adjustButtonText}>Adjust View</Text>
        </Pressable>

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Disease</Text>
        {DISEASE_PROGRAMS.map((program) => (
          <DiseaseCard
            key={program.key}
            label={program.cardLabel}
            onPress={() => navigation.navigate("DiseaseProgression", { programKey: program.key })}
          />
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
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  sectionLabelSpaced: {
    marginTop: spacing.md,
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.green,
  },
  segmentText: {
    ...type.button,
    color: colors.teal,
  },
  segmentTextActive: {
    color: colors.textOnDark,
  },
  disabled: {
    opacity: 0.4,
  },
  adjustButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.deepRed,
  },
  adjustButtonText: {
    ...type.button,
    color: colors.deepRed,
  },
  error: {
    marginBottom: spacing.sm,
    color: colors.coral,
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
  panelTitle: {
    ...type.value,
    color: colors.textOnLight,
  },
});
