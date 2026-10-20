import { describe, it, expect } from "bun:test";
import { exportLevel, importLevel } from "./storage";
import { buildUlamData } from "./ulam";
import { countDropTiles, dropPanelWarnings } from "./drops";
const ulam = buildUlamData(5);
const cells = Array.from({ length: 25 }, () => ({ type: "CORRIDOR" }));
cells[3] = { type: "DROP" };
const base = { levelNumber: 1, levelName: "L", requiredFragments: 0, notes: "", mode: "maze" };
describe("maze drops", () => {
  it("exports and restores keyDrops/dropPool", () => {
    const d = exportLevel(cells, ulam, { ...base, keyDrops: ["key_clock"], dropPool: [{ drop_key: "herb", chance: 30 }] });
    expect(d.keyDrops).toEqual(["key_clock"]);
    expect(d.dropPool).toEqual([{ drop_key: "herb", chance: 30 }]);
    const m = importLevel(d).meta;
    expect(m.keyDrops).toEqual(["key_clock"]);
    expect(m.dropPool).toEqual([{ drop_key: "herb", chance: 30 }]);
  });
  it("omits empty arrays and non-maze modes", () => {
    const d = exportLevel(cells, ulam, { ...base, keyDrops: [], dropPool: [] });
    expect("keyDrops" in d || "dropPool" in d).toBe(false);
    const v = exportLevel(cells, ulam, { ...base, mode: "village", keyDrops: ["key_clock"] });
    expect("keyDrops" in v).toBe(false);
    const legacy = exportLevel(cells, ulam, base);
    expect(exportLevel(importLevel(legacy).cells, ulam, importLevel(legacy).meta)).toEqual(legacy);
  });
  it("warns", () => {
    expect(countDropTiles(cells)).toBe(1);
    expect(dropPanelWarnings(["k"], [], 0)).toEqual(["Place at least one Drop tile"]);
    expect(dropPanelWarnings(["k"], [{ drop_key: "a", chance: 1 }], 1)).toEqual(["More drops than drop tiles"]);
    expect(dropPanelWarnings(["k"], [], 1)).toEqual([]);
  });
});
