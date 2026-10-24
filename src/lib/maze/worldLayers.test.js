import { describe, it, expect } from "bun:test";
import { eraForLevel, isActiveAt, paintLayerCell, windowSideAt, worldAtLevel } from "./worldLayers";
import { exportLevel, importLevel } from "./storage";
import { buildUlamData } from "./ulam";

const size = 5;
const ulam = buildUlamData(size);
const meta = { mode: "village", levelNumber: 1, levelName: "town1", requiredFragments: 0, notes: "" };
const world = {
  size,
  villageOffset: { col: 0, row: 0 },
  window: { start: 3, end: 5, levels: 30 },
  eras: [
    { name: "Founding", from: 1, to: 10, street: "cobble" },
    { name: "Expansion", from: 11, to: 30, street: "brick" },
  ],
};
const baseLayers = [
  { col: 1, row: 1, type: "OPEN", from: 1 },
  { col: 2, row: 2, type: "FOREST", from: 1, until: 4 },
  { col: 2, row: 2, type: "ROAD", from: 5 },
];

describe("Village world layers", () => {
  it("shows the entry active at each level and defaults to OPEN", () => {
    const at1 = worldAtLevel(baseLayers, size, 1);
    expect(at1[1 * size + 1]).toEqual({ type: "OPEN" });
    expect(at1[2 * size + 2]).toEqual({ type: "FOREST" });
    expect(at1[0]).toEqual({ type: "OPEN" });
    expect(worldAtLevel(baseLayers, size, 4)[2 * size + 2]).toEqual({ type: "FOREST" });
    expect(worldAtLevel(baseLayers, size, 5)[2 * size + 2]).toEqual({ type: "ROAD" });
    expect(worldAtLevel(baseLayers, size, 30)[2 * size + 2]).toEqual({ type: "ROAD" });
  });
  it("restores tone and age on world-layer buildings", () => {
    const layers = [{ col: 0, row: 0, type: "BUILDING_M", tone: "plum", age: 2, from: 3 }];
    expect(worldAtLevel(layers, size, 3)[0]).toEqual({ type: "BUILDING_M", tone: "plum", age: 2 });
    expect(worldAtLevel(layers, size, 2)[0]).toEqual({ type: "OPEN" });
  });
  it("names the era for a level and sizes the walkable window", () => {
    expect(eraForLevel(world, 1)).toBe("Founding");
    expect(eraForLevel(world, 15)).toBe("Expansion");
    expect(windowSideAt(world, 1)).toBe(3);
    expect(windowSideAt(world, 30)).toBe(5);
    expect(windowSideAt(world, 15)).toBe(4);
  });
  it("paints at level 5: new cell appears from 5 onward, never below", () => {
    const painted = paintLayerCell(baseLayers, 1, 1, { type: "BUILDING_S", tone: "sand", age: 4 }, 5);
    expect(painted.find((e) => e.col === 1 && e.row === 1 && e.from === 1).until).toBe(4);
    const added = painted.find((e) => e.col === 1 && e.row === 1 && e.from === 5);
    expect(added).toMatchObject({ type: "BUILDING_S", tone: "sand", age: 4 });
    expect(added.until).toBeUndefined();
    for (const level of [1, 2, 3, 4]) {
      expect(worldAtLevel(painted, size, level)[1 * size + 1]).toEqual({ type: "OPEN" });
    }
    for (const level of [5, 17, 30]) {
      expect(worldAtLevel(painted, size, level)[1 * size + 1]).toEqual({ type: "BUILDING_S", tone: "sand", age: 4 });
    }
    expect(baseLayers.find((e) => e.col === 1 && e.row === 1).until).toBeUndefined();
  });
  it("repainting at the same level replaces the entry instead of stacking", () => {
    const once = paintLayerCell(baseLayers, 1, 1, { type: "ROAD" }, 3);
    const twice = paintLayerCell(once, 1, 1, { type: "SQUARE" }, 3);
    const at3 = twice.filter((e) => e.col === 1 && e.row === 1 && isActiveAt(e, 3));
    expect(at3).toHaveLength(1);
    expect(at3[0]).toMatchObject({ type: "SQUARE", from: 3 });
    expect(worldAtLevel(twice, size, 2)[1 * size + 1]).toEqual({ type: "OPEN" });
  });
  it("caps a painted entry at the next later entry for that position", () => {
    const painted = paintLayerCell(baseLayers, 2, 2, { type: "WALL" }, 3);
    const added = painted.find((e) => e.col === 2 && e.row === 2 && e.from === 3);
    expect(added.until).toBe(4);
    expect(worldAtLevel(painted, size, 3)[2 * size + 2]).toEqual({ type: "WALL" });
    expect(worldAtLevel(painted, size, 5)[2 * size + 2]).toEqual({ type: "ROAD" });
  });
  it("is a no-op when the painted cell matches the active entry", () => {
    const same = paintLayerCell(baseLayers, 2, 2, { type: "FOREST" }, 2);
    expect(same).toBe(baseLayers);
  });
  it("exports world and worldLayers unchanged and restores them on import", () => {
    const cells = worldAtLevel(baseLayers, size, 1);
    const data = exportLevel(cells, ulam, meta, { world, worldLayers: baseLayers });
    expect(data.world).toEqual(world);
    expect(data.worldLayers).toEqual(baseLayers);
    const loaded = importLevel(data);
    expect(loaded.world).toEqual(world);
    expect(loaded.worldLayers).toEqual(baseLayers);
    expect(loaded.cells).toEqual(cells);
    const reexported = exportLevel(loaded.cells, ulam, loaded.meta, { world: loaded.world, worldLayers: loaded.worldLayers });
    expect(reexported).toEqual(data);
  });
  it("leaves drafts without worldLayers unchanged", () => {
    const cells = Array.from({ length: size * size }, () => ({ type: "OPEN" }));
    const data = exportLevel(cells, ulam, meta);
    expect("world" in data).toBe(false);
    expect("worldLayers" in data).toBe(false);
    const loaded = importLevel(data);
    expect(loaded.world).toBeUndefined();
    expect(loaded.worldLayers).toBeUndefined();
  });
});
