import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useRelayConnector } from "../useRelayConnector";
import { FLOATER_ENTRIES, type DiseaseEntry } from "../diseaseInfo";
import { DiseaseCard } from "../components/DiseaseCard";
import { colors, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "FloaterList">;

/** The floater conditions, reached from the Floaters symptom box. */
export function FloaterListScreen({ navigation }: Props) {
  const { status, setDisease, reset } = useRelayConnector();
  const paired = status === "paired";

  function handleSelect(entry: DiseaseEntry) {
    const disease = entry.variants[0];
    if (paired) setDisease(disease);
    navigation.navigate("DiseaseControl", { disease });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            reset();
            navigation.goBack();
          }}
          hitSlop={12}
        >
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Floaters
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {FLOATER_ENTRIES.map((entry) => (
          <DiseaseCard key={entry.key} label={entry.cardLabel} onPress={() => handleSelect(entry)} />
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
});
