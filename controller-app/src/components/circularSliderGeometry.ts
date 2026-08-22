/**
 * Geometry for the severity dial, kept free of React Native imports so the
 * angle maths can be unit tested - synthetic DOM events never reach React
 * Native's responder system, so driving the real component in a browser
 * proves nothing.
 */

export const SIZE = 200;
export const STROKE = 16;
export const THUMB = 13;
export const RADIUS = (SIZE - STROKE - THUMB) / 2;
export const CENTER = SIZE / 2;

// Open dial: a 270 degree sweep with the gap at the bottom, so the two ends
// read as distinct min and max rather than meeting in an ambiguous ring.
// Angles put 0 at the top and run clockwise, so 225 starts bottom-left.
export const START_ANGLE = 225;
export const SWEEP = 270;

export function polar(angleDeg: number, radius = RADIUS) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

export function arcPath(fromDeg: number, toDeg: number): string {
  const start = polar(fromDeg);
  const end = polar(toDeg);
  const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** Maps a touch inside the dial to a 0..1 value. */
export function valueForPoint(x: number, y: number): number {
  // atan2 measures from the positive x axis; shift so 0 is the top of the
  // dial and the range runs clockwise 0..360
  let angle = (Math.atan2(y - CENTER, x - CENTER) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;

  let offset = angle - START_ANGLE;
  if (offset < 0) offset += 360;

  // Inside the bottom gap: snap to whichever end is nearer so dragging past
  // an extreme sticks there instead of jumping across the dial.
  if (offset > SWEEP) return offset - SWEEP < (360 - SWEEP) / 2 ? 1 : 0;

  return offset / SWEEP;
}
