import type { CellState, WorldData, WorldLayerEntry } from "./types";
import { cellFromExtraEntry, extraFieldsFor } from "./storage";

export const WORLD_LEVEL_MIN = 1;
export const WORLD_LEVEL_MAX = 30;

export function isActiveAt(entry: WorldLayerEntry, level: number) {
  return entry.from <= level && (entry.until === undefined || entry.until >= level);
}

/** The world as it looks at one level: one active entry per position. */
export function worldAtLevel(
  layers: WorldLayerEntry[],
  size: number,
  level: number,
): CellState[] {
  const cells: CellState[] = Array.from({ length: size * size }, () => ({ type: "OPEN" }));
  for (const e of layers) {
    if (!isActiveAt(e, level)) continue;
    if (e.col < 0 || e.col >= size || e.row < 0 || e.row >= size) continue;
    cells[e.row * size + e.col] = cellFromExtraEntry(e, "village");
  }
  return cells;
}

export function eraForLevel(world: WorldData, level: number): string | null {
  const era = world.eras?.find((e) => level >= e.from && level <= e.to);
  return era?.name ?? null;
}

/** Side of the walkable window square at a level, centred in the map. */
export function windowSideAt(world: WorldData, level: number): number | null {
  const w = world.window;
  if (!w || !Number.isFinite(w.start) || !Number.isFinite(w.end) || !w.levels) return null;
  const t = w.levels <= 1 ? 0 : (level - 1) / (w.levels - 1);
  return Math.round(w.start + (w.end - w.start) * t);
}

export function cellsEqual(a: CellState, b: CellState) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Paint a cell into the layers at a level. The entry active at the level is
 * closed off (until = level - 1) or replaced (when it starts at the level),
 * and a new entry runs from the level up to the next later entry, if any.
 * Levels below the painted level keep their previous appearance.
 */
export function paintLayerCell(
  layers: WorldLayerEntry[],
  col: number,
  row: number,
  cell: CellState,
  level: number,
): WorldLayerEntry[] {
  const atPos = (e: WorldLayerEntry) => e.col === col && e.row === row;
  const active = layers.find((e) => atPos(e) && isActiveAt(e, level));
  if (active && cellsEqual(cellFromExtraEntry(active, "village"), cell)) return layers;
  const nextLater = layers
    .filter((e) => atPos(e) && e.from > level)
    .sort((a, b) => a.from - b.from)[0];
  const newEntry: WorldLayerEntry = {
    col,
    row,
    type: cell.type,
    ...extraFieldsFor(cell, "village"),
    from: level,
    ...(nextLater ? { until: nextLater.from - 1 } : {}),
  };
  const out: WorldLayerEntry[] = [];
  for (const e of layers) {
    if (!atPos(e) || e !== active) {
      out.push(e);
      continue;
    }
    // Active entry starting at this level is replaced; an older one is closed.
    if (e.from < level) out.push({ ...e, until: level - 1 });
  }
  out.push(newEntry);
  return out;
}
