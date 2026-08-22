import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { DISEASE_INFO, activeSymptomsAt, findProgram } from "../diseaseInfo";
import { colors, radius, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "DiseaseProgression">;

const TICK_MS = 100;

function formatClock(seconds: number): string {
  const whole = Math.floor(seconds);
  return `0:${String(whole).padStart(2, "0")}`;
}

/**
 * A disease is played, not dialled. Unlike a symptom - one effect held at
 * whatever the slider says - a disease is a fixed run in which symptoms stack
 * up in a clinically meaningful order, so the only controls here are transport
 * controls and the real job of this screen is showing what has accumulated.
 *
 * The run is local to this screen for now: nothing is pushed to the headset
 * until the progression commands are wired through the relay.
 */
export function DiseaseProgressionScreen({ route, navigation }: Props) {
  const program = findProgram(route.params.programKey);

  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  // wall-clock origin rather than accumulating ticks, so a slow frame costs
  // accuracy for one tick instead of drifting across the whole run
  const startedAtRef = useRef(0);

  const duration = program?.durationSeconds ?? 0;

  useEffect(() => {
    if (!playing || !duration) return;

    startedAtRef.current = Date.now() - elapsed * 1000;
    const id = setInterval(() => {
      const next = (Date.now() - startedAtRef.current) / 1000;
      if (next >= duration) {
        setElapsed(duration);
        setPlaying(false);
      } else {
        setElapsed(next);
      }
    }, TICK_MS);

    return () => clearInterval(id);
    // elapsed is read once to resume from where a pause left off; listing it
    // would restart the interval on every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);

  if (!program) {
    return (
      <View style={styles.root}>
        <Text style={styles.error}>Unknown disease.</Text>
      </View>
    );
  }

  let currentIndex = -1;
  program.stages.forEach((stage, i) => {
    if (elapsed >= stage.at) currentIndex = i;
  });

  const active = activeSymptomsAt(program, elapsed);
  const blackedOut = currentIndex >= 0 && Boolean(program.stages[currentIndex].blackout);
  const finished = elapsed >= duration;

  function restart() {
    setElapsed(0);
    setPlaying(true);
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {program.cardLabel}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.clinicalLabel}>{program.clinicalLabel}</Text>

        <View style={styles.clockRow}>
          <Text style={styles.clock}>{formatClock(elapsed)}</Text>
          <Text style={styles.clockTotal}>/ {formatClock(duration)}</Text>
        </View>

        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${(elapsed / duration) * 100}%` }]} />
        </View>

        <View style={styles.transport}>
          <Pressable
            style={[styles.playButton, finished && styles.playButtonSpent]}
            onPress={() => (finished ? restart() : setPlaying((p) => !p))}
          >
            <Text style={styles.playButtonText}>
              {finished ? "Replay" : playing ? "Pause" : elapsed > 0 ? "Resume" : "Play"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.textButton, elapsed === 0 && styles.disabled]}
            disabled={elapsed === 0}
            onPress={() => {
              setPlaying(false);
              setElapsed(0);
            }}
          >
            <Text style={styles.textButtonLabel}>Reset</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Active now</Text>
        {blackedOut ? (
          <View style={styles.blackoutBanner}>
            <Text style={styles.blackoutText}>Permanent blindness</Text>
          </View>
        ) : active.length ? (
          <View style={styles.chipRow}>
            {active.map((disease) => (
              <View key={disease} style={styles.chip}>
                <Text style={styles.chipText}>{DISEASE_INFO[disease].symptomName}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>Nothing yet — press play.</Text>
        )}

        <Text style={styles.sectionLabel}>Progression</Text>
        {program.stages.map((stage, i) => {
          const reached = i <= currentIndex;
          const current = i === currentIndex;
          return (
            <View key={stage.label} style={styles.stageRow}>
              <View style={styles.gutter}>
                <View style={[styles.dot, reached && styles.dotReached, current && styles.dotCurrent]} />
                {i < program.stages.length - 1 ? (
                  <View style={[styles.rail, reached && styles.railReached]} />
                ) : null}
              </View>

              <View style={styles.stageBody}>
                <Text style={[styles.stageTime, reached && styles.stageTimeReached]}>
                  {formatClock(stage.at)}
                </Text>
                <Text style={[styles.stageLabel, reached && styles.stageLabelReached]}>
                  {stage.label}
                </Text>
                {stage.adds.length ? (
                  <Text style={styles.stageAdds}>
                    + {stage.adds.map((d) => DISEASE_INFO[d].symptomName).join(", ")}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}

        <Text style={styles.note}>
          Each stage keeps everything before it. Preview only — this run does not drive the headset yet.
        </Text>
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
  clinicalLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  clockRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  clock: {
    ...type.title,
    fontSize: 44,
    color: colors.charcoal,
  },
  clockTotal: {
    ...type.body,
    color: colors.textMuted,
  },
  track: {
    height: 6,
    marginTop: spacing.sm,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    backgroundColor: colors.coral,
  },
  transport: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  playButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.deepRed,
  },
  playButtonSpent: {
    backgroundColor: colors.teal,
  },
  playButtonText: {
    ...type.button,
    color: colors.offWhite,
  },
  textButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.charcoal,
  },
  textButtonLabel: {
    ...type.button,
    color: colors.charcoal,
  },
  disabled: {
    opacity: 0.4,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.sandLight,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  chipText: {
    ...type.button,
    fontSize: 13,
    color: colors.charcoal,
  },
  blackoutBanner: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.charcoal,
  },
  blackoutText: {
    ...type.button,
    color: colors.offWhite,
  },
  muted: {
    ...type.body,
    color: colors.textMuted,
  },
  stageRow: {
    flexDirection: "row",
  },
  gutter: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 11,
    height: 11,
    marginTop: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.textMuted,
    backgroundColor: colors.offWhiteDeep,
  },
  dotReached: {
    borderColor: colors.deepRed,
    backgroundColor: colors.deepRed,
  },
  dotCurrent: {
    borderColor: colors.coral,
    backgroundColor: colors.coral,
  },
  rail: {
    flex: 1,
    width: 1,
    backgroundColor: colors.border,
  },
  railReached: {
    backgroundColor: colors.deepRed,
  },
  stageBody: {
    flex: 1,
    paddingBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  stageTime: {
    ...type.sectionLabel,
    fontSize: 11,
    color: colors.textMuted,
  },
  stageTimeReached: {
    color: colors.deepRed,
  },
  stageLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  stageLabelReached: {
    ...type.button,
    color: colors.charcoal,
  },
  stageAdds: {
    ...type.body,
    fontSize: 13,
    color: colors.teal,
  },
  note: {
    ...type.body,
    fontSize: 13,
    marginTop: spacing.lg,
    color: colors.textMuted,
  },
  error: {
    margin: spacing.lg,
    color: colors.coral,
  },
});
