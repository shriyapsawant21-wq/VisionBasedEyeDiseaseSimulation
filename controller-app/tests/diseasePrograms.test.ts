import { describe, it, expect } from "vitest";
import { DISEASE_PROGRAMS, activeSymptomsAt, findProgram } from "../src/diseaseInfo";

/**
 * The progression screen tells the doctor what the wearer is seeing while Unity
 * plays the run off its own clock. Nothing on the wire corrects a wrong stage
 * list, so these guard the parts that could silently start lying.
 */
describe("disease programs", () => {
  it("keys every program to a case Unity's timeline actually implements", () => {
    // Mirrors VisionEffectManager.ApplyDiseaseTimeline's switch. A key that
    // drifts from these renders nothing at all on the headset.
    const unityCases = ["RP", "RRD", "CSCR", "DR_DME", "CNVM"];
    expect(DISEASE_PROGRAMS.map((p) => p.key).sort()).toEqual([...unityCases].sort());
  });

  it("orders stages by time so accumulation cannot skip one", () => {
    for (const program of DISEASE_PROGRAMS) {
      const times = program.stages.map((s) => s.at);
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(times[times.length - 1]).toBeLessThan(program.durationSeconds);
    }
  });

  it("accumulates symptoms as stages are reached", () => {
    const rrd = findProgram("RRD")!;
    expect(activeSymptomsAt(rrd, 0)).toEqual(["RETINAL_DETACHMENT"]);
    expect(activeSymptomsAt(rrd, 16)).toEqual([
      "RETINAL_DETACHMENT",
      "PVD_WEISS_RING",
      "RD_FLASH",
    ]);
  });

  it("reports nothing before the first stage is reached", () => {
    const cscr = findProgram("CSCR")!;
    expect(activeSymptomsAt(cscr, -1)).toEqual([]);
  });

  it("drops a symptom Unity fades back out", () => {
    const cscr = findProgram("CSCR")!;
    expect(activeSymptomsAt(cscr, 13)).toEqual(["METAMORPHOPSIA", "CENTRAL_SCOTOMA"]);
    // Unity fades metamorphopsia to nothing by ~26s, leaving only the scotoma.
    expect(activeSymptomsAt(cscr, 26)).toEqual(["CENTRAL_SCOTOMA"]);
  });

  it("clears everything at a blackout, which only DR_DME reaches", () => {
    const blackoutPrograms = DISEASE_PROGRAMS.filter((p) =>
      p.stages.some((s) => s.blackout),
    ).map((p) => p.key);
    // RRD ends on a full curtain, not a blackout - Unity holds its blackout
    // channel at 0 for that program.
    expect(blackoutPrograms).toEqual(["DR_DME"]);

    const dr = findProgram("DR_DME")!;
    expect(activeSymptomsAt(dr, 20).length).toBeGreaterThan(0);
    expect(activeSymptomsAt(dr, 29)).toEqual([]);
  });
});
