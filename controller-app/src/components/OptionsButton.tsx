import { Pressable, StyleSheet, Text } from "react-native";

/** Top-right options glyph that opens a SidePanel. Plain text, no icon library dependency. */
export function OptionsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress} hitSlop={12}>
      <Text style={styles.glyph}>⋮</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  glyph: {
    fontSize: 22,
    fontWeight: "bold",
  },
});
