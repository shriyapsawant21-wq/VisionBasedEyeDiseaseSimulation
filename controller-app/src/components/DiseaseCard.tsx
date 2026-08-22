import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type } from "../theme";

const STUB_WIDTH = 72;
const CARD_HEIGHT = 72;
const OFFSET = 6;
const DASH_COUNT = 7;

/**
 * Ticket/boarding-pass styling: a hard offset block sits behind and below
 * the card, with a deep oxblood stub down the left and a dashed
 * perforation. The disease name is the only copy on the card.
 */
export function DiseaseCard({
  label,
  onPress,
  compact = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  /** Half-width so two cards sit side by side in a row. */
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.wrapper, compact && styles.wrapperCompact, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.shadowBlock} />

      <View style={styles.card}>
        <View style={[styles.stub, compact && styles.stubCompact]} />

        <View style={styles.perforation}>
          {Array.from({ length: DASH_COUNT }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>

        <View style={[styles.body, compact && styles.bodyCompact]}>
          <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={2}>
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: OFFSET,
    paddingRight: OFFSET,
    marginBottom: spacing.md,
  },
  wrapperCompact: {
    flex: 1,
  },
  disabled: {
    opacity: 0.45,
  },
  shadowBlock: {
    position: "absolute",
    top: OFFSET,
    left: OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: radius.md,
    backgroundColor: colors.charcoal,
  },
  card: {
    flexDirection: "row",
    height: CARD_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  stub: {
    width: STUB_WIDTH,
    backgroundColor: colors.deepRed,
  },
  stubCompact: {
    width: 34,
  },
  perforation: {
    justifyContent: "space-evenly",
    alignItems: "center",
    width: 1,
    paddingVertical: spacing.sm,
  },
  dash: {
    width: 1,
    height: 6,
    backgroundColor: colors.textMuted,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  bodyCompact: {
    paddingHorizontal: spacing.md,
  },
  label: {
    ...type.value,
    fontSize: 19,
    color: colors.charcoal,
  },
  labelCompact: {
    fontSize: 16,
  },
});
