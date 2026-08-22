import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { setDisclaimerAccepted } from "../onboarding";
import { colors, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Disclaimer">;

export function DisclaimerScreen({ navigation }: Props) {
  async function handleAgree() {
    await setDisclaimerAccepted();
    navigation.replace("MainTabs");
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.logo}>VisionSim VR</Text>
        <Text style={styles.subtitle}>Educational Simulation Only</Text>

        <View style={styles.notice}>
          <Text style={styles.noticeItem}>Not a diagnostic tool</Text>
          <Text style={styles.noticeItem}>Effects are approximations</Text>
          <Text style={styles.noticeItem}>Stop immediately if dizzy or nauseous</Text>
        </View>

        <Text style={styles.body}>
          This software is for training purposes and does not replace professional medical diagnosis.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.agreeButton} onPress={handleAgree}>
          <Text style={styles.agreeButtonText}>I Understand & Agree</Text>
        </Pressable>
        <Pressable style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.offWhite,
    justifyContent: "space-between",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  logo: {
    ...type.title,
    color: colors.textOnLight,
  },
  subtitle: {
    ...type.sectionLabel,
    color: colors.coral,
    textTransform: "uppercase",
  },
  notice: {
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    paddingLeft: spacing.md,
    gap: spacing.sm,
  },
  noticeItem: {
    ...type.body,
    color: colors.textOnLight,
  },
  body: {
    ...type.body,
    color: colors.textMuted,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  agreeButton: {
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  agreeButtonText: {
    ...type.button,
    color: colors.white,
  },
  cancelButton: {
    backgroundColor: colors.sand,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    ...type.button,
    color: colors.textOnLight,
  },
});
