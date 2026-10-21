import { describe, expect, test } from "bun:test";
import { exportLevel, importLevel } from "./storage";
import { buildUlamData } from "./ulam";
import { nextVillage } from "./buildings";

const meta = { mode: "village", levelNumber: 1, levelName: "Village1", requiredFragments: 0, notes: "" };
const cells = Array.from({ length: 9 }, () => ({ type: "ROAD" }));
const ulam = buildUlamData(3);

describe("Village path style persistence", () => {
  test("each explicit choice exports at the top level and reloads", () => {
    for (const streetStyle of ["cobble", "plates", "brick"]) {
      const data = exportLevel(cells, ulam, { ...meta, streetStyle });
      expect(data.streetStyle).toBe(streetStyle);
      expect(importLevel(data).meta.streetStyle).toBe(streetStyle);
      expect(exportLevel(importLevel(data).cells, ulam, importLevel(data).meta)).toEqual(data);
    }
  });
  test("untouched legacy village omits the render-only cobble default", () => {
    const legacy = exportLevel(cells, ulam, meta);
    expect(Object.hasOwn(legacy, "streetStyle")).toBe(false);
    const loaded = importLevel(legacy);
    expect(loaded.meta.streetStyle ?? "cobble").toBe("cobble");
    expect(exportLevel(loaded.cells, ulam, loaded.meta)).toEqual(legacy);
  });
  test("other modes never export the Village-only field", () => {
    for (const mode of ["maze", "library", "shadow_realm", "exchange"]) {
      expect(Object.hasOwn(exportLevel(cells, ulam, { ...meta, mode, streetStyle: "brick" }), "streetStyle")).toBe(false);
    }
  });
  test("next village copies the style without changing its source", () => {
    const source = { ...meta, streetStyle: "plates" };
    const next = nextVillage(cells, source);
    expect(next.meta.streetStyle).toBe("plates");
    expect(next.meta.levelNumber).toBe(2);
    expect(source.levelNumber).toBe(1);
    expect(source.streetStyle).toBe("plates");
  });
});