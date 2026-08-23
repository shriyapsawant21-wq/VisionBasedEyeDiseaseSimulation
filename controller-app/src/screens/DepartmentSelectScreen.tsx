import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { DiseaseCard } from "../components/DiseaseCard";
import { DepartmentIcon, type DepartmentIconName } from "../components/DepartmentIcons";
import { colors, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "DepartmentSelect">;

interface Department {
  key: string;
  label: string;
  subtitle: string;
  icon: DepartmentIconName;
  badge: { text: string; tone: "live" | "soon" };
}

/**
 * Retina is the only department this build actually implements - the others
 * are listed so the app reads as one dashboard for the whole practice, not a
 * single-purpose tool, but they carry no simulation of their own yet.
 */
const DEPARTMENTS: Department[] = [
  {
    key: "RETINA",
    label: "Retina",
    subtitle: "5 modules · video simulation",
    icon: "retina",
    badge: { text: "LIVE", tone: "live" },
  },
  {
    key: "CATARACT",
    label: "Cataract – IOL",
    subtitle: "IOL / cataract counselling",
    icon: "cataract",
    badge: { text: "SOON", tone: "soon" },
  },
  {
    key: "NEURO",
    label: "Neuro-Ophthal",
    subtitle: "Optic nerve & visual field",
    icon: "neuro",
    badge: { text: "SOON", tone: "soon" },
  },
  {
    key: "GLAUCOMA",
    label: "Glaucoma",
    subtitle: "Peripheral field loss",
    icon: "glaucoma",
    badge: { text: "SOON", tone: "soon" },
  },
];

export function DepartmentSelectScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.appName}>ProVision</Text>
        <Text style={styles.subtitle}>Select a Department</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {DEPARTMENTS.map((dept) => (
          <DiseaseCard
            key={dept.key}
            label={dept.label}
            subtitle={dept.subtitle}
            icon={<DepartmentIcon name={dept.icon} />}
            badge={dept.badge}
            disabled={dept.key !== "RETINA"}
            onPress={() => navigation.replace("MainTabs")}
          />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.charcoal,
    gap: 2,
  },
  appName: {
    ...type.value,
    color: colors.textOnDark,
  },
  subtitle: {
    ...type.sectionLabel,
    color: colors.sand,
    textTransform: "uppercase",
  },
  container: {
    padding: spacing.lg,
  },
});
