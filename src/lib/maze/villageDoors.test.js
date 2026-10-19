import { describe, expect, test } from "bun:test";
import { exportLevel, importLevel } from "./storage";
import { buildUlamData } from "./ulam";
import { swatchFor, villageDoorWarning } from "./palette";

const meta = { mode: "village", levelNumber: 1, levelName: "Village", requiredFragments: 0, notes: "" };
const doors = [{ type: "DOOR_MAZE" }, { type: "DOOR_LIBRARY" }, { type: "DOOR_EXCHANGE" }];

describe("Village entrances", () => {
  for (const door of doors) {
    test(`${door.type} exports as a single cell and imports unchanged`, () => {
      const cells = Array.from({ length: 9 }, () => ({ type: "OPEN" }));
      cells[4] = door;
      const data = exportLevel(cells, buildUlamData(3), meta);
      expect(data.extraCells?.find((cell) => cell.type === door.type)).toEqual({ col: 1, row: 1, type: door.type });
      expect(importLevel(data).cells[4]).toEqual(door);
    });
  }
  test("door swatches match the requested colors", () => {
    expect(swatchFor("DOOR_MAZE", "village")).toBe("#f5c060");
    expect(swatchFor("DOOR_LIBRARY", "village")).toBe("#62a8ff");
    expect(swatchFor("DOOR_EXCHANGE", "village")).toBe("#b79bff");
  });
  test("numbered buildings still export and import unchanged", () => {
    const cells = [{ type: "BUILDING_23" }, { type: "BUILDING_47" }, { type: "BUILDING_89" }, ...Array.from({ length: 6 }, () => ({ type: "OPEN" }))];
    expect(importLevel(exportLevel(cells, buildUlamData(3), meta)).cells).toEqual(cells);
  });
  test("publishing validation identifies only missing door categories", () => {
    expect(villageDoorWarning("village", [doors[0], doors[2]])).toBe("No Library door placed");
    expect(villageDoorWarning("village", [])).toBe("No Maze door placed; No Library door placed; No Exchange door placed");
    expect(villageDoorWarning("village", doors)).toBe("");
  });
  test("other modes never warn about Village entrances", () => {
    for (const mode of ["maze", "shadow_realm", "library", "exchange", "bernard_room"]) {
      expect(villageDoorWarning(mode, [])).toBe("");
    }
  });
});