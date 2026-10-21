import { describe, it, expect } from "bun:test";
import { libraryGroupFor, groupLibraryDrafts, initialLibraryGroups, LIBRARY_GROUPS_KEY } from "./libraryGroups";

const draft = (name, mode = "maze", levelNumber = 1, status = "draft") => ({ id: name, status, data: { levelName: name, mode, levelNumber } });

describe("Library grouping rules", () => {
  it("recognizes core modes, arbitrary rooms, and legacy garden names", () => {
    const entries = [draft("Level1"), draft("Village", "village"), draft("Shadow", "shadow_realm"), draft("Bernard", "bernard_room"), draft("Custom", "custom_room"), draft("GardenSpring2026", "library"), draft("GardenAutumn", "exchange"), draft("Summer", "Garden"), draft("Unknown", "")];
    expect(entries.map(libraryGroupFor)).toEqual(["MAZES", "VILLAGES", "SHADOW REALM", "ROOMS", "ROOMS", "GARDENS", "GARDENS", "GARDENS", "OTHER"]);
  });
  it("puts READY before DRAFT in every group", () => {
    const rows = groupLibraryDrafts([draft("Level1"), draft("Level10", "maze", 10, "ready"), draft("Alpha", "library"), draft("Zebra", "library", 1, "ready")], "");
    expect(rows.find((g) => g.name === "MAZES").rows.map((d) => d.id)).toEqual(["Level10", "Level1"]);
    expect(rows.find((g) => g.name === "ROOMS").rows.map((d) => d.id)).toEqual(["Zebra", "Alpha"]);
  });
  it("sorts maze level numbers numerically", () => {
    const rows = groupLibraryDrafts([draft("Level10", "maze", 10), draft("Level8", "maze", 8), draft("Level7", "maze", 7)], "")[0].rows;
    expect(rows.map((d) => d.data.levelNumber)).toEqual([7, 8, 10]);
  });
  it("sorts other groups by name", () => {
    const rooms = groupLibraryDrafts([draft("Zebra", "library"), draft("Alpha", "exchange")], "").find((g) => g.name === "ROOMS");
    expect(rooms.rows.map((d) => d.id)).toEqual(["Alpha", "Zebra"]);
  });
  it("filters names across groups and hides nonmatching groups", () => {
    expect(groupLibraryDrafts([draft("Level8"), draft("Village", "village"), draft("GardenSpring", "library")], " LEVEL ").map((g) => g.name)).toEqual(["MAZES"]);
  });
  it("defaults to mazes and the current group open, gardens otherwise closed", () => {
    expect(initialLibraryGroups()).toEqual({ MAZES: true, VILLAGES: false, "SHADOW REALM": false, ROOMS: false, GARDENS: false, OTHER: false });
    expect(initialLibraryGroups(undefined, "GARDENS").GARDENS).toBe(true);
  });
  it("restores saved booleans and opens the current draft's group", () => {
    expect(LIBRARY_GROUPS_KEY).toBe("weaver_library_groups");
    expect(initialLibraryGroups({ MAZES: false, ROOMS: true, GARDENS: false }, "GARDENS")).toEqual({ MAZES: false, VILLAGES: false, "SHADOW REALM": false, ROOMS: true, GARDENS: true, OTHER: false });
  });
});