/**
 * Pure angle math for CircularSlider, kept separate from the component so it
 * can be unit-tested without touching react-native-svg or PanResponder.
 *
 * The dial is a 270° arc with a 90° gap centred at the bottom, so the track
 * never wraps directly under the thumb's resting position. Angles are in the
 * standard screen convention: 0° is the 3 o'clock point, increasing
 * clockwise (matches atan2(dy, dx) with RN's downward-positive y-axis, and
 * matches how an SVG <Circle>'s own stroke-dash starts at 0° and draws
 * clockwise - so the same angle numbers work directly as an SVG transform).
 */

export const START_ANGLE = 135;
export const SWEEP_ANGLE = 270;
// In sliderAngle space (relative to START_ANGLE, see touchToValue below), the
// gap spans (SWEEP_ANGLE, 360). This is its midpoint, not an absolute angle.
const GAP_MIDPOINT_RELATIVE = SWEEP_ANGLE + (360 - SWEEP_ANGLE) / 2;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Value in [0,1] -> absolute angle in [0,360) where the thumb sits. */
export function valueToAngle(value: number): number {
  return (START_ANGLE + clamp01(value) * SWEEP_ANGLE) % 360;
}

/**
 * A touch point's offset from the dial's centre -> the value it represents.
 * Points inside the 90° gap snap to whichever end of the track they're
 * closer to, so a drag that overshoots the arc doesn't jump the thumb to the
 * opposite end.
 */
export function touchToValue(dx: number, dy: number): number {
  const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normalized = rawAngle < 0 ? rawAngle + 360 : rawAngle;

  let sliderAngle = normalized - START_ANGLE;
  if (sliderAngle < 0) sliderAngle += 360;

  if (sliderAngle <= SWEEP_ANGLE) {
    return sliderAngle / SWEEP_ANGLE;
  }

  // In the gap: closer to the end of the track than to its start snaps to 1,
  // otherwise snaps to 0. GAP_MIDPOINT_RELATIVE sits exactly between the ends.
  return sliderAngle < GAP_MIDPOINT_RELATIVE ? 1 : 0;
}

export function polarToPoint(
  centerX: number,
  centerY: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(rad),
    y: centerY + radius * Math.sin(rad),
  };
}
