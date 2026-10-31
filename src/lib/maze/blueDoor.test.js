import { describe, expect, test } from "bun:test";
import { removeBlueDoor, placeBlueDoor } from "./blueDoor";
import { exportLevel, importLevel } from "./storage";
import { generateMaze } from "./generator";
import { buildUlamData } from "./ulam";

const meta = { mode: "maze", levelNumber: 1, levelName: "Level 1", requiredFragments: 0, notes: "" };
const ulam = buildUlamData(5);
const blank = () => Array.from({ length: 25 }, () => ({ type: "CORRIDOR" }));

describe("Optional Maze blue door", () => {
  test("Level 1 with blueDoor null remains null through load and save/export", () => {
    const data = exportLevel(blank(), ulam, meta);
    expect(data.blueDoor).toBeNull();
    const loaded = importLevel(data);
    expect(loaded.cells.some((cell) => cell.type === "BLUE_DOOR")).toBe(false);
    expect(exportLevel(loaded.cells, ulam, loaded.meta)).toEqual(data);
  });
  test("turning No blue door on clears only the blue door and blue-room links", () => {
    const cells = blank();
    cells[0] = { type: "BLUE_DOOR" };
    cells[1] = { type: "DOOR_TO_ROOM", door: { roomId: "blue", reentry: { col: 2, row: 2 } } };
    cells[2] = { type: "DOOR_TO_ROOM", door: { roomId: "blue_room", reentry: { col: 2, row: 2 } } };
    cells[3] = { type: "DOOR_TO_ROOM", door: { roomId: "library", reentry: { col: 2, row: 2 } } };
    cells[4] = { type: "ROOM_DOOR", roomDoor: { color: "blue" } };
    const cleared = removeBlueDoor(cells);
    const data = exportLevel(cleared, ulam, meta);
    expect(data.blueDoor).toBeNull();
    expect(data.doorsToRoom.map((door) => door.roomId)).toEqual(["library"]);
    expect(cleared[4]).toEqual(cells[4]);
    expect(cells[0].type).toBe("BLUE_DOOR");
  });
  test("manual placement is singleton and a placed door still round-trips", () => {
    const cells = placeBlueDoor(placeBlueDoor(blank(), 6), 8);
    expect(cells.filter((cell) => cell.type === "BLUE_DOOR")).toHaveLength(1);
    expect(cells[6].type).toBe("CORRIDOR");
    const data = exportLevel(cells, ulam, meta);
    expect(data.blueDoor).toEqual({ col: 3, row: 1 });
    expect(importLevel(data).cells).toEqual(cells);
  });
  test("regeneration never automatically places a blue door", () => {
    for (const deadEnds of [0, 50, 100]) {
      const cells = generateMaze({ size: 30, deadEnds, branching: 50 });
      expect(cells.some((cell) => cell.type === "BLUE_DOOR")).toBe(false);
      expect(exportLevel(cells, buildUlamData(30), meta).blueDoor).toBeNull();
    }
  });
});