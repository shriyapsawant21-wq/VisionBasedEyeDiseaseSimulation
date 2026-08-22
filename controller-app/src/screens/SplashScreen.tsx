import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { hasAcceptedDisclaimer } from "../onboarding";
import { colors, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

const MIN_SPLASH_MS = 900;

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;

    async function decideNextScreen() {
      const [accepted, _minDelay] = await Promise.all([
        hasAcceptedDisclaimer(),
        new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
      ]);
      if (cancelled) return;

      navigation.replace(accepted ? "DepartmentSelect" : "Disclaimer");
    }

    decideNextScreen();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VisionSim VR</Text>
      <Text style={styles.subtitle}>Educational Simulation Only</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.charcoal,
    gap: 8,
  },
  title: {
    ...type.title,
    color: colors.textOnDark,
  },
  subtitle: {
    ...type.sectionLabel,
    color: colors.sand,
    textTransform: "uppercase",
  },
});
