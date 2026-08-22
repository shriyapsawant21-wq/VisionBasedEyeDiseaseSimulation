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
import { colors, spacing, type } from "../theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, "Disease">,
  NativeStackScreenProps<RootStackParamList>
>;

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
 * and deliberately holds nothing but the disease list - the whole run for a
 * given condition lives on DiseaseProgressionScreen, one tap away.
 *
 * Diseases carry no severity control: each one is a timed run where symptoms
 * accumulate, so there is nothing to push on selection the way the Symptoms
 * tab pushes SET_DISEASE.
 */
export function DashboardScreen({ navigation }: Props) {
  const { status, sessionId, lastError, disconnect } = useRelayConnector();
  const [panelOpen, setPanelOpen] = useState(false);

  const paired = status === "paired";

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

        <Text style={styles.sectionLabel}>Disease</Text>
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
