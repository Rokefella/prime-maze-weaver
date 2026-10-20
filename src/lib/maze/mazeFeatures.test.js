import { describe, expect, test } from "bun:test";
import { draftFragments, formatPrime, fragmentSummary, isPrimeNumber } from "./fragments";
import { consoleDoorWarning, placeConsoleDoor } from "./consoleDoor";
import { exportLevel, importLevel } from "./storage";
import { buildUlamData } from "./ulam";
import { computeReachable } from "./generator";

const entries = (numbers) => numbers.map((prime, col) => ({ prime, col, row: 0 }));
const meta = { mode: "maze", levelNumber: 1, levelName: "Test", requiredFragments: 5, notes: "" };
describe("Maze prime rules", () => {
  test("Level 1 has middle 677 and code 02083", () => {
    const list = entries([2, 653, 677, 701, 727]);
    const result = fragmentSummary(list);
    expect(list[result.middleIndex].prime).toBe(677);
    expect(result.code).toBe("02083");
  });
  test("Level 2 has middle 2917 and code 10460", () => {
    const list = entries([181, 1499, 2917, 4297, 4483]);
    const result = fragmentSummary(list);
    expect(list[result.middleIndex].prime).toBe(2917);
    expect(result.code).toBe("10460");
  });
  test("even and fewer than three fragments have no code", () => {
    for (const list of [[], [2], [2, 3], [2, 3, 5, 7]]) expect(fragmentSummary(entries(list)).code).toBe("");
    expect(fragmentSummary(entries([2, 3])).middleIndex).toBe(-1);
  });
  test("five-digit formatting never truncates longer codes", () => {
    expect(formatPrime(829)).toBe("00829");
    expect(formatPrime(123456)).toBe("123456");
  });
  test("warnings flag even counts, composites, large primes and duplicates", () => {
    expect(fragmentSummary(entries([2, 3])).warnings).toHaveLength(1);
    expect(fragmentSummary(entries([2, 4, 5])).warnings).toHaveLength(1);
    expect(fragmentSummary(entries([2, 3, 100003])).warnings).toHaveLength(1);
    expect(fragmentSummary(entries([2, 2, 3])).warnings).toHaveLength(1);
    expect(isPrimeNumber(4)).toBe(false);
    expect(isPrimeNumber(100003)).toBe(true);
  });
  test("finder entries target only fragments using current canonical numbers, sorted", () => {
    const ulam = buildUlamData(30);
    const cells = Array.from({ length: 900 }, () => ({ type: "CORRIDOR" }));
    for (const n of [727, 2, 701, 677, 653]) cells[ulam.numbers.indexOf(n)] = { type: "FRAGMENT" };
    const list = draftFragments(cells, ulam);
    expect(list.map((entry) => entry.prime)).toEqual([2, 653, 677, 701, 727]);
    const target = list.find((entry) => entry.prime === 653);
    expect(ulam.numbers[target.row * 30 + target.col]).toBe(653);
    expect(list.find((entry) => entry.prime === 829)).toBeUndefined();
  });
});
describe("Console door", () => {
  test("moving leaves exactly one console door and restores the old corridor", () => {
    const cells = Array.from({ length: 9 }, () => ({ type: "CORRIDOR" }));
    const first = placeConsoleDoor(cells, 4);
    const moved = placeConsoleDoor(first, 7);
    expect(moved.filter((cell) => cell.type === "CONSOLE_DOOR")).toHaveLength(1);
    expect(moved[4]).toEqual({ type: "CORRIDOR" });
    expect(moved[7]).toEqual({ type: "CONSOLE_DOOR" });
    expect(cells[4]).toEqual({ type: "CORRIDOR" });
  });
  test("exports bare extraCells entry and imports unchanged", () => {
    const cells = placeConsoleDoor(Array.from({ length: 9 }, () => ({ type: "CORRIDOR" })), 4);
    const data = exportLevel(cells, buildUlamData(3), meta);
    expect(data.extraCells).toEqual([{ col: 1, row: 1, type: "CONSOLE_DOOR" }]);
    expect(importLevel(data).cells).toEqual(cells);
  });
  test("console door is reachable exactly as room door", () => {
    const cells = [{ type: "CORRIDOR" }, { type: "CONSOLE_DOOR" }, { type: "ROOM_DOOR" }, ...Array.from({ length: 6 }, () => ({ type: "WALL" }))];
    expect(Array.from(computeReachable(cells, 3, { col: 0, row: 0 })).slice(0, 3)).toEqual([1, 1, 1]);
  });
  test("only Maze checks for a missing console entrance", () => {
    expect(consoleDoorWarning("maze", [])).not.toBe("");
    expect(consoleDoorWarning("maze", [{ type: "CONSOLE_DOOR" }])).toBe("");
    for (const mode of ["village", "shadow_realm", "library"]) expect(consoleDoorWarning(mode, [])).toBe("");
  });
  test("legacy draft export remains identical after import", () => {
    const ulam = buildUlamData(3);
    const cells = Array.from({ length: 9 }, () => ({ type: "CORRIDOR" }));
    cells[0] = { type: "WALL" };
    cells[4] = { type: "ROOM_DOOR", roomDoor: { color: "blue" } };
    const data = exportLevel(cells, ulam, meta);
    const restored = importLevel(data);
    expect(exportLevel(restored.cells, ulam, restored.meta)).toEqual(data);
  });
});