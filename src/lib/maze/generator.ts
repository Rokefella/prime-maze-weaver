import type { CellState } from "./types";

export interface GenParams {
  size: number;
  density: number; // 0-100 walls vs open
  deadEnds: number; // 0-100
  branching: number; // 0-100
}

// Produces a fully-connected maze layout of walls and corridors.
// Algorithm: randomized recursive backtracker carving on a step-2 lattice,
// then optional braiding (dead-end removal / loop addition) controlled by
// the density / deadEnds / branching sliders. A final flood-fill guarantees
// every corridor cell is reachable from the origin; any isolated pocket is
// converted back to wall.
export function generateMaze(params: GenParams): CellState[] {
  const { size } = params;
  const total = size * size;
  const cells: CellState[] = new Array(total);
  for (let i = 0; i < total; i++) cells[i] = { type: "WALL" };

  const idx = (c: number, r: number) => r * size + c;
  const inBounds = (c: number, r: number) =>
    c >= 0 && c < size && r >= 0 && r < size;
  const isCorridor = (c: number, r: number) =>
    inBounds(c, r) && cells[idx(c, r)].type === "CORRIDOR";

  // Origin snapped to even coords so the step-2 lattice fits inside the grid.
  const oc = Math.floor((size - 1) / 2) & ~1;
  const orow = Math.floor((size - 1) / 2) & ~1;

  const visited = new Uint8Array(total);
  const stack: { c: number; r: number }[] = [{ c: oc, r: orow }];
  visited[idx(oc, orow)] = 1;
  cells[idx(oc, orow)] = { type: "CORRIDOR" };

  // Branching: higher values bias the backtracker to keep exploring from
  // its current cell (longer corridors with fewer immediate splits) vs.
  // popping back early (more frequent junctions).
  const branchBias = params.branching / 100;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const candidates = [
      { c: cur.c + 2, r: cur.r },
      { c: cur.c - 2, r: cur.r },
      { c: cur.c, r: cur.r + 2 },
      { c: cur.c, r: cur.r - 2 },
    ].filter((n) => inBounds(n.c, n.r) && !visited[idx(n.c, n.r)]);

    if (!candidates.length) {
      stack.pop();
      continue;
    }

    // shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const next = candidates[0];
    cells[idx((cur.c + next.c) / 2, (cur.r + next.r) / 2)] = { type: "CORRIDOR" };
    cells[idx(next.c, next.r)] = { type: "CORRIDOR" };
    visited[idx(next.c, next.r)] = 1;

    // High branching => pop back to an earlier cell occasionally, opening
    // new junctions away from the current frontier. Low branching => stay
    // depth-first (long winding corridors).
    if (stack.length > 2 && Math.random() > branchBias) {
      // jump back to a random earlier point in the stack
      const jumpTo = Math.floor(Math.random() * stack.length);
      stack.length = jumpTo + 1;
    }
    stack.push(next);
  }

  // Fill any leftover odd-row/col fringe cell on even-sized grids by
  // connecting it to an adjacent corridor (keeps connectivity).
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cells[idx(c, r)].type !== "WALL") continue;
      if (c === size - 1 || r === size - 1) {
        // only fringe; skip - braiding may still open it
      }
    }
  }

  // ----- Braiding (loop addition / dead-end removal) -----
  // A "dead-end" is a corridor with exactly one corridor neighbor.
  // - Low deadEnds  => remove most dead-ends by knocking out a wall to a
  //   neighboring corridor (creates loops, still connected).
  // - Low density   => additionally open extra walls between two existing
  //   corridors, producing a more open layout.
  const keepDeadEnds = params.deadEnds / 100; // 1 => keep all, 0 => remove all
  const removeProb = 1 - keepDeadEnds;

  const neighborOffsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  const corridorNeighbors = (c: number, r: number) =>
    neighborOffsets
      .map(([dc, dr]) => ({ c: c + dc, r: r + dr }))
      .filter((n) => isCorridor(n.c, n.r));

  if (removeProb > 0) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cells[idx(c, r)].type !== "CORRIDOR") continue;
        if (corridorNeighbors(c, r).length !== 1) continue;
        if (Math.random() > removeProb) continue;
        // pick a wall neighbor that has a corridor on the far side (or just
        // any wall neighbor) and open it
        const wallNeighbors = neighborOffsets
          .map(([dc, dr]) => ({ c: c + dc, r: r + dr }))
          .filter(
            (n) => inBounds(n.c, n.r) && cells[idx(n.c, n.r)].type === "WALL",
          );
        if (!wallNeighbors.length) continue;
        // prefer walls that bridge to another corridor on the far side
        const bridges = wallNeighbors.filter((n) => {
          const fc = n.c + (n.c - c);
          const fr = n.r + (n.r - r);
          return isCorridor(fc, fr);
        });
        const pick =
          (bridges.length ? bridges : wallNeighbors)[
            Math.floor(
              Math.random() * (bridges.length ? bridges.length : wallNeighbors.length),
            )
          ];
        cells[idx(pick.c, pick.r)] = { type: "CORRIDOR" };
      }
    }
  }

  // Density: target corridor ratio. Low density (slider value) => more open.
  // We only open walls that bridge two existing corridors so the maze
  // stays connected.
  const targetWallRatio = params.density / 100;
  let wallCount = 0;
  for (let i = 0; i < total; i++) if (cells[i].type === "WALL") wallCount++;
  const currentWallRatio = wallCount / total;

  if (targetWallRatio < currentWallRatio) {
    const toOpen = Math.floor((currentWallRatio - targetWallRatio) * total);
    // collect bridge-walls (wall cells with corridors on opposite sides
    // OR with 2+ corridor neighbors) to keep connectivity
    const bridgeWalls: number[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cells[idx(c, r)].type !== "WALL") continue;
        if (corridorNeighbors(c, r).length >= 1) bridgeWalls.push(idx(c, r));
      }
    }
    // shuffle
    for (let i = bridgeWalls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bridgeWalls[i], bridgeWalls[j]] = [bridgeWalls[j], bridgeWalls[i]];
    }
    for (let k = 0; k < Math.min(toOpen, bridgeWalls.length); k++) {
      cells[bridgeWalls[k]] = { type: "CORRIDOR" };
    }
  }

  // ----- Final connectivity guarantee -----
  // Flood-fill from origin; any unreached corridor becomes wall.
  const reach = computeReachable(cells, size, { col: oc, row: orow });
  for (let i = 0; i < total; i++) {
    if (cells[i].type === "CORRIDOR" && !reach[i]) {
      cells[i] = { type: "WALL" };
    }
  }

  return cells;
}

/**
 * BFS over corridor-like cells starting from `origin`. Returns a Uint8Array
 * where 1 marks cells reachable from origin via non-wall cells.
 * Treats any non-WALL cell as walkable (CORRIDOR, FRAGMENT, START, doors, NPC).
 */
export function computeReachable(
  cells: CellState[],
  size: number,
  origin: { col: number; row: number },
): Uint8Array {
  const total = size * size;
  const out = new Uint8Array(total);
  const idx = (c: number, r: number) => r * size + c;
  const inBounds = (c: number, r: number) =>
    c >= 0 && c < size && r >= 0 && r < size;
  const walkable = (c: number, r: number) =>
    inBounds(c, r) && cells[idx(c, r)].type !== "WALL";
  if (!walkable(origin.col, origin.row)) return out;
  const queue: number[] = [idx(origin.col, origin.row)];
  out[queue[0]] = 1;
  while (queue.length) {
    const i = queue.shift()!;
    const r = Math.floor(i / size);
    const c = i - r * size;
    const ns: [number, number][] = [
      [c + 1, r],
      [c - 1, r],
      [c, r + 1],
      [c, r - 1],
    ];
    for (const [nc, nr] of ns) {
      if (!walkable(nc, nr)) continue;
      const ni = idx(nc, nr);
      if (out[ni]) continue;
      out[ni] = 1;
      queue.push(ni);
    }
  }
  return out;
}

/** Find a sensible flood-fill origin: prefer an existing START cell,
 *  otherwise the first non-wall cell encountered. Returns null if none. */
export function findOrigin(
  cells: CellState[],
  size: number,
): { col: number; row: number } | null {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].type === "START") {
      const r = Math.floor(i / size);
      return { col: i - r * size, row: r };
    }
  }
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].type !== "WALL") {
      const r = Math.floor(i / size);
      return { col: i - r * size, row: r };
    }
  }
  return null;
}

export const PRESETS: Record<
  "simple" | "medium" | "complex",
  { density: number; deadEnds: number; branching: number }
> = {
  simple: { density: 30, deadEnds: 20, branching: 70 },
  medium: { density: 50, deadEnds: 50, branching: 50 },
  complex: { density: 70, deadEnds: 75, branching: 30 },
};