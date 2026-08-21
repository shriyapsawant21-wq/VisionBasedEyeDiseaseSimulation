import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { parseIncoming } from "../src/validation";

/**
 * Guards shared/protocol/examples against drift: every documented example must
 * still behave the way the docs claim once protocol.ts changes.
 */

const EXAMPLES = resolve(process.cwd(), "../shared/protocol/examples");

function load(kind: string) {
  const dir = resolve(EXAMPLES, kind);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ name: f, raw: readFileSync(resolve(dir, f), "utf8") }));
}

describe("shared/protocol examples", () => {
  const valid = load("valid");
  const invalid = load("invalid");

  it("finds examples to check", () => {
    expect(valid.length).toBeGreaterThan(0);
    expect(invalid.length).toBeGreaterThan(0);
  });

  for (const { name, raw } of valid) {
    it("accepts valid/" + name, () => {
      const result = parseIncoming(raw);
      if (!result.ok) {
        throw new Error(name + " should be accepted but failed: " + result.reason);
      }
    });
  }

  for (const { name, raw } of invalid) {
    it("rejects invalid/" + name, () => {
      const result = parseIncoming(raw);
      expect(result.ok).toBe(false);
    });
  }
});
