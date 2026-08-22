import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { MainTabsParamList } from "../navigation/MainTabs";
import { useRelayConnector } from "../useRelayConnector";
import { SYMPTOM_ENTRIES, type DiseaseEntry } from "../diseaseInfo";
import { DiseaseCard } from "../components/DiseaseCard";
import { colors, spacing, type } from "../theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, "Symptoms">,
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

/** Symptoms driven on their own, without a disease wrapped around them. */
export function SymptomListScreen({ navigation }: Props) {
  const { status, sessionId, lastError, setDisease } = useRelayConnector();
  const paired = status === "paired";

  function handleSelect(entry: DiseaseEntry) {
    const disease = entry.variants[0];
    if (paired) setDisease(disease);
    navigation.navigate("DiseaseControl", { disease });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.appName}>Symptoms</Text>
        <Text style={[styles.statusLine, paired && styles.statusLinePaired]}>
          {statusLabel(status, sessionId)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {lastError ? (
          <Text style={styles.error}>
            {lastError.code}: {lastError.message}
          </Text>
        ) : null}

        {SYMPTOM_ENTRIES.map((entry) => (
          <DiseaseCard key={entry.key} label={entry.cardLabel} onPress={() => handleSelect(entry)} />
        ))}

        {/* the only symptom with sub-types, so it opens a list instead */}
        <DiseaseCard label="Floaters" onPress={() => navigation.navigate("FloaterList")} />
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
  error: {
    marginBottom: spacing.sm,
    color: colors.coral,
  },
});
