import { useMemo, useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, type } from "../theme";
import {
  SIZE,
  STROKE,
  THUMB,
  START_ANGLE,
  SWEEP,
  arcPath,
  polar,
  valueForPoint,
} from "./circularSliderGeometry";

/**
 * Radial replacement for the linear slider. Keeps the same value contract:
 * onChange fires continuously while dragging, onComplete once on release, so
 * only one command per gesture reaches the relay.
 */
export function CircularSlider({
  value,
  onChange,
  onComplete,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  onComplete: (value: number) => void;
  disabled?: boolean;
}) {
  // the responder is created once, so it reads live values through refs
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const panResponder = useMemo(() => {
    const update = (x: number, y: number) => {
      if (disabledRef.current) return;
      onChangeRef.current(valueForPoint(x, y));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: (event) => update(event.nativeEvent.locationX, event.nativeEvent.locationY),
      onPanResponderMove: (event) => update(event.nativeEvent.locationX, event.nativeEvent.locationY),
      onPanResponderRelease: () => {
        if (!disabledRef.current) onCompleteRef.current(valueRef.current);
      },
    });
  }, []);

  const clamped = Math.min(1, Math.max(0, value));
  const endAngle = START_ANGLE + clamped * SWEEP;
  const thumb = polar(endAngle);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg width={SIZE} height={SIZE}>
        <Path
          d={arcPath(START_ANGLE, START_ANGLE + SWEEP)}
          stroke={colors.border}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        {clamped > 0 ? (
          <Path
            d={arcPath(START_ANGLE, endAngle)}
            stroke={colors.deepRed}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        <Circle cx={thumb.x} cy={thumb.y} r={THUMB} fill={colors.white} stroke={colors.deepRed} strokeWidth={3} />
      </Svg>

      <View style={styles.readout} pointerEvents="none">
        <Text style={styles.value}>{Math.round(clamped * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignSelf: "center",
  },
  readout: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    ...type.title,
    fontSize: 40,
    color: colors.deepRed,
  },
});
