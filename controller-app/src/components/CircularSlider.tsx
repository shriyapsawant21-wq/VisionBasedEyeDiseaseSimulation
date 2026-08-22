import { useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { START_ANGLE, SWEEP_ANGLE, polarToPoint, touchToValue } from "../circularSliderGeometry";
import { colors, type } from "../theme";

const SIZE = 220;
const STROKE_WIDTH = 16;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TRACK_LENGTH = (SWEEP_ANGLE / 360) * CIRCUMFERENCE;

/**
 * A 270° dial with the value shown in the centre, replacing the linear
 * slider. Dragging anywhere in the component reads an angle off the touch
 * point rather than tracking a thumb hitbox, so the whole ring is draggable,
 * not just the small circle on it.
 */
export function CircularSlider({
  value,
  onValueChange,
  onSlidingComplete,
  disabled = false,
  label,
}: {
  value: number;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  /** Small caption under the percentage, e.g. the severity's unit label. */
  label?: string;
}) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
      onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
      onPanResponderRelease: (evt) =>
        handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY, true),
      onPanResponderTerminate: (evt) =>
        handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY, true),
    }),
  ).current;

  function handleTouch(x: number, y: number, isFinal = false) {
    const next = touchToValue(x - CENTER, y - CENTER);
    onValueChange(next);
    if (isFinal) onSlidingComplete?.(next);
  }

  const thumbAngle = START_ANGLE + value * SWEEP_ANGLE;
  const thumb = polarToPoint(CENTER, CENTER, RADIUS, thumbAngle);
  const progressLength = (value * SWEEP_ANGLE * CIRCUMFERENCE) / 360;

  return (
    <View style={[styles.wrapper, disabled && styles.disabled]} {...panResponder.panHandlers}>
      <Svg width={SIZE} height={SIZE}>
        {/*
          A raw SVG `transform="rotate(...)"` string, not react-native-svg's
          `rotation`/`origin` shorthand - that shorthand renders as a
          `transform-origin` DOM attribute on the web target, which React's
          SVG attribute allowlist doesn't recognize and logs as invalid on
          every frame. Both circles share this center, so rotating the group
          is equivalent and the raw attribute avoids the warning entirely.
        */}
        <G transform={`rotate(${START_ANGLE} ${CENTER} ${CENTER})`}>
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.border}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${TRACK_LENGTH} ${CIRCUMFERENCE}`}
            fill="none"
          />
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.coral}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${progressLength} ${CIRCUMFERENCE}`}
            fill="none"
          />
        </G>
        <Circle cx={thumb.x} cy={thumb.y} r={STROKE_WIDTH / 2 + 4} fill={colors.coral} stroke={colors.white} strokeWidth={3} />
      </Svg>

      <View style={styles.centerLabel} pointerEvents="none">
        <Text style={styles.percentText}>{Math.round(value * 100)}%</Text>
        {label ? <Text style={styles.captionText}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  centerLabel: {
    position: "absolute",
    alignItems: "center",
  },
  percentText: {
    ...type.title,
    fontSize: 40,
    color: colors.coral,
  },
  captionText: {
    ...type.sectionLabel,
    fontSize: 11,
    marginTop: 2,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
});
