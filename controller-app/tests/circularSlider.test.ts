import { describe, it, expect } from "vitest";
import { valueForPoint } from "../src/components/circularSliderGeometry";

// Mirrors the constants in CircularSlider: a 200pt dial whose 270 degree
// sweep starts bottom-left and ends bottom-right.
const CENTER = 100;
const R = 60;

/** Point on the dial at `deg`, where 0 is the top and angles run clockwise. */
function pointAt(deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CENTER + R * Math.cos(rad), y: CENTER + R * Math.sin(rad) };
}

describe("valueForPoint", () => {
  it("reads 0 at the bottom-left start of the sweep", () => {
    const p = pointAt(225);
    expect(valueForPoint(p.x, p.y)).toBeCloseTo(0, 5);
  });

  it("reads 1 at the bottom-right end of the sweep", () => {
    const p = pointAt(135);
    expect(valueForPoint(p.x, p.y)).toBeCloseTo(1, 5);
  });

  it("reads 0.5 straight up", () => {
    const p = pointAt(360);
    expect(valueForPoint(p.x, p.y)).toBeCloseTo(0.5, 5);
  });

  it("reads a quarter turn into the sweep as 0.25", () => {
    const p = pointAt(225 + 0.25 * 270);
    expect(valueForPoint(p.x, p.y)).toBeCloseTo(0.25, 5);
  });

  it("snaps to 1 just past the high end, inside the bottom gap", () => {
    const p = pointAt(140);
    expect(valueForPoint(p.x, p.y)).toBe(1);
  });

  it("snaps to 0 just before the low end, inside the bottom gap", () => {
    const p = pointAt(220);
    expect(valueForPoint(p.x, p.y)).toBe(0);
  });

  it("never returns a value outside 0..1 anywhere on the dial", () => {
    for (let deg = 0; deg < 360; deg += 3) {
      const p = pointAt(deg);
      const value = valueForPoint(p.x, p.y);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
