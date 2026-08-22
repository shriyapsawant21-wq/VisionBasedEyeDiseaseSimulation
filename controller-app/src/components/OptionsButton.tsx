import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../theme";

const SIZE = 22;
const CORNER = 7;
const THICKNESS = 2;

/**
 * QR-scanner glyph that opens the SidePanel - four viewfinder corners
 * around a centre line, drawn with plain Views so there's no icon-font or
 * SVG dependency. Tinted to the screen background it sits against.
 */
export function OptionsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress} hitSlop={12}>
      <View style={styles.frame}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        <View style={styles.scanLine} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  frame: {
    width: SIZE,
    height: SIZE,
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: colors.offWhiteDeep,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: THICKNESS,
    borderLeftWidth: THICKNESS,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: THICKNESS,
    borderRightWidth: THICKNESS,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: THICKNESS,
    borderLeftWidth: THICKNESS,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: THICKNESS,
    borderRightWidth: THICKNESS,
  },
  scanLine: {
    position: "absolute",
    left: 1,
    right: 1,
    top: SIZE / 2 - THICKNESS / 2,
    height: THICKNESS,
    backgroundColor: colors.offWhiteDeep,
  },
});
