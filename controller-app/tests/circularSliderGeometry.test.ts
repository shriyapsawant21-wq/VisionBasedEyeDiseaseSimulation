import { describe, it, expect } from "vitest";
import { valueToAngle, touchToValue, polarToPoint, START_ANGLE, SWEEP_ANGLE } from "../src/circularSliderGeometry";

describe("circularSliderGeometry", () => {
  describe("valueToAngle", () => {
    it("places 0 at the start of the arc", () => {
      expect(valueToAngle(0)).toBe(START_ANGLE);
    });

    it("places 1 at the end of the arc, wrapped into [0,360)", () => {
      expect(valueToAngle(1)).toBe((START_ANGLE + SWEEP_ANGLE) % 360);
    });

    it("places 0.5 at the arc's midpoint", () => {
      expect(valueToAngle(0.5)).toBe(START_ANGLE + SWEEP_ANGLE / 2);
    });

    it("clamps out-of-range values instead of extrapolating past the arc", () => {
      expect(valueToAngle(-0.5)).toBe(START_ANGLE);
      expect(valueToAngle(1.5)).toBe((START_ANGLE + SWEEP_ANGLE) % 360);
    });
  });

  describe("touchToValue", () => {
    function pointAtAngle(angleDeg: number) {
      const rad = (angleDeg * Math.PI) / 180;
      return { dx: Math.cos(rad), dy: Math.sin(rad) };
    }

    it("reads a touch at the start of the arc as 0", () => {
      const { dx, dy } = pointAtAngle(START_ANGLE);
      expect(touchToValue(dx, dy)).toBeCloseTo(0, 5);
    });

    it("reads a touch at the end of the arc as 1", () => {
      const { dx, dy } = pointAtAngle(START_ANGLE + SWEEP_ANGLE);
      expect(touchToValue(dx, dy)).toBeCloseTo(1, 5);
    });

    it("reads a touch at the arc's midpoint as 0.5", () => {
      const { dx, dy } = pointAtAngle(START_ANGLE + SWEEP_ANGLE / 2);
      expect(touchToValue(dx, dy)).toBeCloseTo(0.5, 5);
    });

    it("snaps a touch just past the end of the arc to 1, not into the gap", () => {
      const { dx, dy } = pointAtAngle(START_ANGLE + SWEEP_ANGLE + 10);
      expect(touchToValue(dx, dy)).toBe(1);
    });

    it("snaps a touch just before the start of the arc to 0", () => {
      const { dx, dy } = pointAtAngle(START_ANGLE - 10);
      expect(touchToValue(dx, dy)).toBe(0);
    });

    it("splits the gap down the middle between the two ends", () => {
      const gapMidpoint = START_ANGLE + SWEEP_ANGLE + (360 - SWEEP_ANGLE) / 2;
      const justBefore = pointAtAngle(gapMidpoint - 1);
      const justAfter = pointAtAngle(gapMidpoint + 1);
      expect(touchToValue(justBefore.dx, justBefore.dy)).toBe(1);
      expect(touchToValue(justAfter.dx, justAfter.dy)).toBe(0);
    });
  });

  describe("polarToPoint", () => {
    it("places angle 0 directly to the right of centre", () => {
      const p = polarToPoint(100, 100, 50, 0);
      expect(p.x).toBeCloseTo(150, 5);
      expect(p.y).toBeCloseTo(100, 5);
    });

    it("places angle 90 directly below centre (screen y grows downward)", () => {
      const p = polarToPoint(100, 100, 50, 90);
      expect(p.x).toBeCloseTo(100, 5);
      expect(p.y).toBeCloseTo(150, 5);
    });
  });
});
