import type { CellState } from "./types";

export interface GenParams {
  size: number;
  density: number; // 0-100 walls vs open
  deadEnds: number; // 0-100
  branching: number; // 0-100
}

// Produces a base layout of walls and corridors.
// Approach: randomized DFS carve from center, then post-process based on params.
export function generateMaze(params: GenParams): CellState[] {
  const { size } = params;
  const total = size * size;
  const cells: CellState[] = new Array(total);
  // start: everything wall
  for (let i = 0; i < total; i++) cells[i] = { type: "WALL" };

  const idx = (c: number, r: number) => r * size + c;
  const inBounds = (c: number, r: number) =>
    c >= 0 && c < size && r >= 0 && r < size;

  // Carve passages with randomized DFS (corridors on every cell).
  const visited = new Uint8Array(total);
  const stack: { c: number; r: number }[] = [];
  const start = { c: Math.floor(size / 2), r: Math.floor(size / 2) };
  stack.push(start);
  visited[idx(start.c, start.r)] = 1;
  cells[idx(start.c, start.r)] = { type: "CORRIDOR" };

  // Branching factor: probability of choosing multiple neighbors (push extras)
  const branchProb = params.branching / 100;
  // Dead-end factor not directly used in carve - used in post.

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const neighbors: { c: number; r: number }[] = [];
    const candidates = [
      { c: cur.c + 2, r: cur.r },
      { c: cur.c - 2, r: cur.r },
      { c: cur.c, r: cur.r + 2 },
      { c: cur.c, r: cur.r - 2 },
    ];
    for (const n of candidates) {
      if (inBounds(n.c, n.r) && !visited[idx(n.c, n.r)]) neighbors.push(n);
    }
    if (!neighbors.length) {
      stack.pop();
      continue;
    }
    // shuffle
    for (let i = neighbors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
    }
    const next = neighbors[0];
    // carve wall between
    const wc = (cur.c + next.c) / 2;
    const wr = (cur.r + next.r) / 2;
    cells[idx(wc, wr)] = { type: "CORRIDOR" };
    cells[idx(next.c, next.r)] = { type: "CORRIDOR" };
    visited[idx(next.c, next.r)] = 1;
    stack.push(next);

    // branching: also push other neighbors at random (visited later)
    for (let k = 1; k < neighbors.length; k++) {
      if (Math.random() < branchProb) {
        const extra = neighbors[k];
        const ec = (cur.c + extra.c) / 2;
        const er = (cur.r + extra.r) / 2;
        cells[idx(ec, er)] = { type: "CORRIDOR" };
        cells[idx(extra.c, extra.r)] = { type: "CORRIDOR" };
        visited[idx(extra.c, extra.r)] = 1;
        stack.push(extra);
      }
    }
  }

  // Density adjustment: low density removes walls (open more), high density adds walls back.
  const targetWallRatio = params.density / 100; // 0 = mostly open, 1 = mostly walls
  // Current ratio of walls:
  let wallCount = 0;
  for (let i = 0; i < total; i++) if (cells[i].type === "WALL") wallCount++;
  const currentRatio = wallCount / total;

  if (targetWallRatio < currentRatio) {
    // Need to open more cells: convert random walls -> corridor
    const toRemove = Math.floor((currentRatio - targetWallRatio) * total);
    let removed = 0;
    let attempts = 0;
    while (removed < toRemove && attempts < toRemove * 10) {
      const i = Math.floor(Math.random() * total);
      if (cells[i].type === "WALL") {
        cells[i] = { type: "CORRIDOR" };
        removed++;
      }
      attempts++;
    }
  } else if (targetWallRatio > currentRatio) {
    // Add walls back into corridor (but never block our start)
    const toAdd = Math.floor((targetWallRatio - currentRatio) * total);
    let added = 0;
    let attempts = 0;
    while (added < toAdd && attempts < toAdd * 10) {
      const i = Math.floor(Math.random() * total);
      if (cells[i].type === "CORRIDOR") {
        cells[i] = { type: "WALL" };
        added++;
      }
      attempts++;
    }
  }

  // Dead-ends: with higher value, randomly cap off corridor ends with walls
  // (close one neighbor of cells that have multiple corridor neighbors).
  const deProb = params.deadEnds / 100;
  if (deProb > 0) {
    for (let r = 1; r < size - 1; r++) {
      for (let c = 1; c < size - 1; c++) {
        if (cells[idx(c, r)].type !== "CORRIDOR") continue;
        if (Math.random() > deProb * 0.3) continue;
        const ns = [
          { c: c + 1, r },
          { c: c - 1, r },
          { c, r: r + 1 },
          { c, r: r - 1 },
        ].filter((n) => cells[idx(n.c, n.r)].type === "CORRIDOR");
        if (ns.length > 2) {
          // close one randomly
          const pick = ns[Math.floor(Math.random() * ns.length)];
          cells[idx(pick.c, pick.r)] = { type: "WALL" };
        }
      }
    }
  }

  return cells;
}

export const PRESETS: Record<
  "simple" | "medium" | "complex",
  { density: number; deadEnds: number; branching: number }
> = {
  simple: { density: 30, deadEnds: 20, branching: 70 },
  medium: { density: 50, deadEnds: 50, branching: 50 },
  complex: { density: 70, deadEnds: 75, branching: 30 },
};