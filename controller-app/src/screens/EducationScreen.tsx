import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../theme";

export function EducationScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Education</Text>
      <Text style={styles.body}>Reference material coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.sandLight,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  title: {
    ...type.title,
    color: colors.textOnLight,
  },
  body: {
    ...type.body,
    color: colors.textMuted,
  },
});
