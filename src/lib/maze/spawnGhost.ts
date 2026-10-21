import type { BuilderMode, CellState, GhostTone } from "./types";

export const SPAWN_SWATCH = "#e8e4ff";
export const GHOST_SWATCH = "#dfe8ff";
export const SPAWN_RADIUS = 4;
export const GHOST_TITLE_MAX = 24;
export const GHOST_LINE_MAX = 140;

export const GHOST_TONES: { key: GhostTone; hex: string }[] = [
  { key: "pale", hex: "#dfe8ff" },
  { key: "mist", hex: "#cfeedd" },
  { key: "gold", hex: "#fff0c0" },
  { key: "rose", hex: "#ffd6e4" },
];

export function ghostToneHex(tone?: string): string {
  return GHOST_TONES.find((t) => t.key === tone)?.hex ?? GHOST_TONES[0].hex;
}

export function isGhostTone(v: unknown): v is GhostTone {
  return GHOST_TONES.some((t) => t.key === v);
}

/** Place the single start place; any other one becomes open ground. */
export function placeSpawn(cells: CellState[], index: number): { cells: CellState[]; moved: boolean } {
  let moved = false;
  const next = cells.map((cell, i) => {
    if (i === index) return { type: "SPAWN" } as CellState;
    if (cell.type === "SPAWN") {
      moved = true;
      return { type: "OPEN" } as CellState;
    }
    return cell;
  });
  return { cells: next, moved };
}

export function spawnWarning(mode: BuilderMode, cells: CellState[]): string {
  return mode === "village" && !cells.some((c) => c.type === "SPAWN") ? "No start place placed" : "";
}

/** Returns a validated ghost, or null when the title is missing. */
export function makeGhost(title: string, line: string, tone: GhostTone) {
  const t = title.trim().slice(0, GHOST_TITLE_MAX);
  if (!t) return null;
  const l = line.trim().slice(0, GHOST_LINE_MAX);
  return { title: t, ...(l ? { line: l } : {}), tone };
}
