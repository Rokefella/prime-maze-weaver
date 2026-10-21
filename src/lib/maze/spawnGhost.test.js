import { describe, expect, test } from "bun:test";
import { existingGhostTitle, makeGhost, placeSpawn, spawnWarning } from "./spawnGhost";
import { exportLevel, importLevel } from "./storage";
import { buildUlamData } from "./ulam";

const meta = (mode) => ({ mode, levelNumber: 1, levelName: "T", requiredFragments: 0, notes: "" });

describe("start place and ghost orbs", () => {
  test("only one start place; placing another moves it", () => {
    const cells = Array.from({ length: 9 }, () => ({ type: "OPEN" }));
    const a = placeSpawn(cells, 1);
    expect(a.moved).toBe(false);
    const b = placeSpawn(a.cells, 7);
    expect(b.moved).toBe(true);
    expect(b.cells.filter((c) => c.type === "SPAWN").length).toBe(1);
    expect(b.cells[7].type).toBe("SPAWN");
  });
  test("village without start place warns", () => {
    expect(spawnWarning("village", [{ type: "OPEN" }])).toBe("No start place placed");
    expect(spawnWarning("village", [{ type: "SPAWN" }])).toBe("");
    expect(spawnWarning("maze", [{ type: "CORRIDOR" }])).toBe("");
  });
  test("ghost titles are optional and capped at 24 characters", () => {
    expect(makeGhost("  ", "", "pale")).toEqual({ tone: "pale" });
    const g = makeGhost("a".repeat(30), "b".repeat(200), "rose");
    expect(g.title.length).toBe(24);
    expect(g.line.length).toBe(140);
    expect(makeGhost("Hi", "", "mist")).toEqual({ title: "Hi", tone: "mist" });
  });
  test("ghost names are optional, trimmed and capped at 20 characters", () => {
    expect(makeGhost("", "", "gold", "  Alice  ")).toEqual({ name: "Alice", tone: "gold" });
    expect(makeGhost("", "", "gold", "a".repeat(25)).name).toHaveLength(20);
  });
  test("new titles reuse case-insensitive duplicates", () => {
    expect(existingGhostTitle(["Listener", "Echo"], " listener ")).toBe("Listener");
    expect(existingGhostTitle(["Echo"], "Listener")).toBeUndefined();
  });
  test("every optional title/name combination round-trips without NPC data", () => {
    const ulam = buildUlamData(3);
    const cells = Array.from({ length: 9 }, () => ({ type: "OPEN" }));
    const ghosts = [makeGhost("", "", "pale"), makeGhost("", "", "mist", "Alice"), makeGhost("Echo", "", "gold"), makeGhost("Echo", "Hi", "rose", "Bob")];
    ghosts.forEach((ghost, i) => { cells[i] = { type: "GHOST", ghost }; });
    const data = exportLevel(cells, ulam, meta("village"));
    ghosts.forEach((ghost, i) => {
      expect(data.extraCells[i]).toEqual({ col: i % 3, row: Math.floor(i / 3), type: "GHOST", ...ghost });
      expect(importLevel(data).cells[i]).toEqual(cells[i]);
    });
    expect(exportLevel(importLevel(data).cells, ulam, meta("village"))).toEqual(data);
  });
  test("export/import keeps spawn and ghosts in every mode", () => {
    const ulam = buildUlamData(3);
    for (const mode of ["village", "maze", "shadow_realm", "library"]) {
      const cells = Array.from({ length: 9 }, () => ({ type: mode === "maze" ? "CORRIDOR" : "OPEN" }));
      cells[2] = { type: "GHOST", ghost: { title: "Old Ann", line: "Hush", tone: "gold" } };
      cells[3] = { type: "GHOST", ghost: { title: "Bo", tone: "pale" } };
      if (mode !== "maze") cells[4] = { type: "SPAWN" };
      const data = exportLevel(cells, ulam, meta(mode));
      const g = data.extraCells.find((e) => e.title === "Bo");
      expect(g).toEqual({ col: 0, row: 1, type: "GHOST", title: "Bo", tone: "pale" });
      if (mode !== "maze") expect(data.extraCells.find((e) => e.type === "SPAWN")).toEqual({ col: 1, row: 1, type: "SPAWN" });
      const back = importLevel(data).cells;
      expect(back[2]).toEqual(cells[2]);
      expect(back[3]).toEqual(cells[3]);
      expect(exportLevel(back, ulam, meta(mode))).toEqual(data);
    }
  });
});
