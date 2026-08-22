import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { DiseaseEnum, DiseaseProgramEnum, SceneEnum, StateDiseaseEnum } from "../src/protocol";

/**
 * unity-vr mirrors protocol.ts by hand, so nothing but a test stops the two
 * drifting. Drift here is silent in the worst way: the relay happily forwards a
 * value Unity has no case for, so the controller looks connected and working
 * while the headset ignores every command. BLOOD_STREAK shipped in DiseaseEnum
 * in exactly that state before this test existed.
 */

const UNITY = resolve(process.cwd(), "../unity-vr/Assets/Project/Scripts");

function read(relativePath: string): string {
  return readFileSync(resolve(UNITY, relativePath), "utf8");
}

/** Maps `RelayProtocol.DiseaseFoo` -> the wire string it is declared as. */
function protocolConstants(): Map<string, string> {
  const source = read("Protocol/RelayProtocol.cs");
  const constants = new Map<string, string>();
  const pattern = /public const string (\w+)\s*=\s*"([^"]+)"/g;
  for (const match of source.matchAll(pattern)) {
    constants.set(match[1], match[2]);
  }
  return constants;
}

/** The wire values named inside one method body of RelayCommandBridge. */
function wireValuesHandledBy(methodName: string): Set<string> {
  const source = read("Networking/RelayCommandBridge.cs");
  // Anchored on the signature, not the bare name: both methods are called from
  // HandleCommand further up the file, and matching that call site instead
  // would scan the wrong region and report every value as missing. "static"
  // is optional - TryParseScene is an instance method (it reads the
  // serialized scene-name fields), the disease mappers are static.
  const signaturePattern = new RegExp(`private (?:static )?bool ${methodName}\\(`);
  const signatureMatch = source.match(signaturePattern);
  expect(signatureMatch, `${methodName} not found in RelayCommandBridge`).not.toBeNull();
  const start = signatureMatch!.index!;

  const rest = source.slice(start + signatureMatch![0].length);
  const next = rest.search(/private (?:static )?bool /);
  const body = next >= 0 ? rest.slice(0, next) : rest;

  const constants = protocolConstants();
  const handled = new Set<string>();
  for (const match of body.matchAll(/RelayProtocol\.(\w+)/g)) {
    const wireValue = constants.get(match[1]);
    if (wireValue) handled.add(wireValue);
  }
  return handled;
}

describe("unity-vr mirrors the protocol", () => {
  it("parses every DiseaseEnum value into a VisionDisease", () => {
    const handled = wireValuesHandledBy("TryParseDisease");
    const missing = DiseaseEnum.options.filter((value) => !handled.has(value));
    expect(missing, "DiseaseEnum values Unity would reject as unknown").toEqual([]);
  });

  it("maps every StateDiseaseEnum value back out for STATE_UPDATED, including NONE", () => {
    const handled = wireValuesHandledBy("TryToWireDisease");
    const missing = StateDiseaseEnum.options.filter((value) => !handled.has(value));
    expect(missing, "VisionDisease values that cannot be reported back").toEqual([]);
  });

  it("declares every DiseaseProgramEnum value as a timeline case", () => {
    // The controller sends these as START_DISEASE_SIMULATION.program and
    // ApplyDiseaseTimeline switches on them as bare string literals.
    const timeline = read("DiseaseEffects/VisionEffectManager.cs");
    const cases = new Set(
      [...timeline.matchAll(/case "([^"]+)":/g)].map((match) => match[1]),
    );
    const missing = DiseaseProgramEnum.options.filter((value) => !cases.has(value));
    expect(missing, "programs Unity has no timeline for").toEqual([]);
  });

  it("parses every SceneEnum value into a loadable scene name", () => {
    const handled = wireValuesHandledBy("TryParseScene");
    const missing = SceneEnum.options.filter((value) => !handled.has(value));
    expect(missing, "SceneEnum values SET_SCENE would reject as unknown").toEqual([]);
  });

  it("keeps PROTOCOL_VERSION in step", () => {
    const source = read("Protocol/RelayProtocol.cs");
    const version = source.match(/public const int Version = (\d+)/);
    expect(version?.[1]).toBe("1");
  });
});
