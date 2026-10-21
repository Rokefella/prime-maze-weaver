import type { SavedLevel } from "./types";

export const LIBRARY_GROUPS = ["MAZES", "VILLAGES", "SHADOW REALM", "ROOMS", "GARDENS", "OTHER"] as const;
export type LibraryGroup = (typeof LIBRARY_GROUPS)[number];
export type LibraryGroupState = Record<LibraryGroup, boolean>;
export const LIBRARY_GROUPS_KEY = "weaver_library_groups";

export function libraryGroupFor(draft: SavedLevel): LibraryGroup {
  const mode = String(draft.data.mode ?? "maze").trim().toLowerCase();
  const name = draft.data.levelName.trim();
  if (mode.startsWith("garden") || /^garden/i.test(name)) return "GARDENS";
  if (mode === "maze") return "MAZES";
  if (mode === "village") return "VILLAGES";
  if (mode === "shadow_realm") return "SHADOW REALM";
  // Arbitrary non-core location keys are room interiors in the builder.
  return mode ? "ROOMS" : "OTHER";
}

export function initialLibraryGroups(saved?: unknown, current?: LibraryGroup): LibraryGroupState {
  const state = Object.fromEntries(LIBRARY_GROUPS.map((group) => [group, group === "MAZES"])) as LibraryGroupState;
  if (saved && typeof saved === "object") {
    for (const group of LIBRARY_GROUPS) {
      const value = (saved as Record<string, unknown>)[group];
      if (typeof value === "boolean") state[group] = value;
    }
  }
  if (current) state[current] = true;
  return state;
}

export function groupLibraryDrafts(drafts: SavedLevel[], search: string) {
  const query = search.trim().toLowerCase();
  return LIBRARY_GROUPS.map((name) => {
    const rows = drafts.filter((draft) => libraryGroupFor(draft) === name && draft.data.levelName.toLowerCase().includes(query));
    rows.sort((a, b) => {
      const statusOrder = Number(b.status === "ready") - Number(a.status === "ready");
      if (statusOrder) return statusOrder;
      if (name === "MAZES") {
        const levelOrder = (a.data.levelNumber ?? Number.MAX_SAFE_INTEGER) - (b.data.levelNumber ?? Number.MAX_SAFE_INTEGER);
        if (levelOrder) return levelOrder;
      }
      return a.data.levelName.localeCompare(b.data.levelName, undefined, { numeric: true, sensitivity: "base" });
    });
    return { name, rows, ready: rows.filter((draft) => draft.status === "ready").length };
  }).filter((group) => !query || group.rows.length > 0);
}