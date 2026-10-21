import { describe, expect, test } from "bun:test";
import { npcOrbFor, NPC_ORB } from "./npcOrb";
import { exportLevel, importLevel } from "./maze/storage";
import { buildUlamData } from "./maze/ulam";

describe("NPC identity compatibility", () => {
  test("matches lowercased key substrings before display names", () => {
    expect(npcOrbFor({ npcKey: "NPC_THE_HACKER", name: "Bernard" })).toBe(NPC_ORB.hacker);
    expect(npcOrbFor({ name: "The Painter" })).toBe(NPC_ORB.painter);
    expect(npcOrbFor({ npc_key: "npc_merchant" })).toBe(NPC_ORB.merchant);
  });
  test("existing named and keyed NPC drafts keep their original data", () => {
    const ulam = buildUlamData(3);
    for (const mode of ["maze", "village", "shadow_realm", "library"]) {
      const cells = Array.from({ length: 9 }, () => ({ type: "CORRIDOR" }));
      cells[4] = { type: "NPC", npc: { name: "The Painter" } };
      const meta = { mode, levelNumber: 1, levelName: "NPC legacy", requiredFragments: 0, notes: "" };
      const data = exportLevel(cells, ulam, meta);
      expect(importLevel(data).cells[4]).toEqual(cells[4]);
      expect(exportLevel(importLevel(data).cells, ulam, meta)).toEqual(data);
      cells[0] = { type: "BERNARD" };
      cells[1] = { type: "MERCHANT" };
      cells[2] = { type: "BANKER" };
      expect(importLevel(exportLevel(cells, ulam, meta)).cells.slice(0, 3)).toEqual(cells.slice(0, 3));
    }
  });
});