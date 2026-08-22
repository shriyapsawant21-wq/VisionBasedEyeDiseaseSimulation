import type { ReactNode } from "react";
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
  subtitle,
  icon,
  badge,
  onPress,
  compact = false,
  disabled = false,
}: {
  label: string;
  /** Small muted line under the label - card count, status, etc. */
  subtitle?: string;
  /** Rendered on the stub instead of a bare block of colour - an SVG glyph, not text. */
  icon?: ReactNode;
  /** Short status pill anchored to the body's right edge, e.g. "LIVE"/"SOON". */
  badge?: { text: string; tone: "live" | "soon" };
  onPress: () => void;
  /** Half-width so two cards sit side by side in a row. */
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.wrapper, compact && styles.wrapperCompact]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.shadowBlock} />

      <View style={[styles.card, disabled && styles.cardDisabled]}>
        <View style={[styles.stub, compact && styles.stubCompact, disabled && styles.contentDisabled]}>
          {icon}
        </View>

        <View style={styles.perforation}>
          {Array.from({ length: DASH_COUNT }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>

        <View style={[styles.body, compact && styles.bodyCompact, disabled && styles.contentDisabled]}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={2}>
              {label}
            </Text>
            {badge ? (
              <View style={[styles.badge, badge.tone === "live" ? styles.badgeLive : styles.badgeSoon]}>
                <Text
                  style={[styles.badgeText, badge.tone === "live" ? styles.badgeTextLive : styles.badgeTextSoon]}
                >
                  {badge.text}
                </Text>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
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
  /**
   * A solid muted fill, not opacity - opacity on the card would blend it with
   * the offset shadowBlock behind it and turn the crisp two-layer ticket look
   * into one smeared blob. Content within dims separately via
   * contentDisabled, which is safe because it only fades against this
   * already-opaque background.
   */
  cardDisabled: {
    backgroundColor: colors.offWhiteDeep,
  },
  contentDisabled: {
    opacity: 0.55,
  },
  stub: {
    width: STUB_WIDTH,
    alignItems: "center",
    justifyContent: "center",
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  label: {
    ...type.value,
    flexShrink: 1,
    fontSize: 19,
    color: colors.charcoal,
  },
  labelCompact: {
    fontSize: 16,
  },
  subtitle: {
    ...type.body,
    fontSize: 12,
    marginTop: 2,
    color: colors.textMuted,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  badgeLive: {
    backgroundColor: colors.teal,
  },
  badgeSoon: {
    backgroundColor: colors.sand,
  },
  badgeText: {
    ...type.sectionLabel,
    fontSize: 10,
  },
  badgeTextLive: {
    color: colors.textOnDark,
  },
  badgeTextSoon: {
    color: colors.textOnLight,
  },
});
