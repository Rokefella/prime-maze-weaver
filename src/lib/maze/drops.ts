import type { CellState } from "./types";

export interface DropPoolEntry {
  drop_key: string;
  chance: number;
}

export interface DropTypeRow {
  id: string;
  drop_key: string;
  name: string;
  category?: string | null;
}

/** Plain DROP tiles plus DROP_SPAWN cells. */
export function countDropTiles(cells: CellState[]): number {
  let n = 0;
  for (const c of cells) if (c.type === "DROP" || c.type === "DROP_SPAWN") n++;
  return n;
}

export function dropPanelWarnings(
  keyDrops: string[],
  dropPool: DropPoolEntry[],
  tileCount: number,
): string[] {
  const total = keyDrops.length + dropPool.length;
  if (total === 0) return [];
  if (tileCount === 0) return ["Place at least one Drop tile"];
  if (total > tileCount) return ["More drops than drop tiles"];
  return [];
}

export function clampChance(v: number): number {
  if (!Number.isFinite(v)) return 30;
  return Math.max(0, Math.min(100, Math.round(v)));
}
