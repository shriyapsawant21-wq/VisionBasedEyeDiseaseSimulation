import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { setStoredRole } from "../onboarding";
import { colors, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "RoleSelection">;

export function RoleSelectionScreen({ navigation }: Props) {
  const [note, setNote] = useState<string | null>(null);

  async function handleDoctorController() {
    await setStoredRole("DOCTOR_CONTROLLER");
    navigation.replace("MainTabs");
  }

  function handleSimulationDevice() {
    // This build is the doctor-side controller only - the Simulation role
    // is played by the Unity headset app, a separate build entirely.
    setNote("The simulation device role runs on the VR headset app, not here.");
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Select Role</Text>
      <Text style={styles.subtitle}>Choose how this device will be used.</Text>

      <Pressable style={styles.doctorCard} onPress={handleDoctorController}>
        <Text style={styles.doctorLabel}>Doctor Controller</Text>
        <Text style={styles.doctorHint}>Pair with a VR headset and run the simulation</Text>
      </Pressable>

      <Pressable style={styles.simCard} onPress={handleSimulationDevice}>
        <Text style={styles.simLabel}>Simulation Device</Text>
      </Pressable>

      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.offWhite,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    ...type.title,
    color: colors.textOnLight,
  },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  doctorCard: {
    backgroundColor: colors.teal,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  doctorLabel: {
    ...type.title,
    fontSize: 22,
    color: colors.textOnDark,
  },
  doctorHint: {
    ...type.body,
    color: colors.textOnDark,
    opacity: 0.85,
  },
  simCard: {
    backgroundColor: colors.sandLight,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  simLabel: {
    ...type.value,
    color: colors.textOnLight,
  },
  note: {
    ...type.body,
    color: colors.coral,
    marginTop: spacing.sm,
  },
});
