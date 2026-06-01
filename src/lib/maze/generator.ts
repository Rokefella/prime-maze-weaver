import type { CellState } from "./types";

export interface GenParams {
  size: number;
  deadEnds: number; // 0-100
  branching: number; // 0-100
}

// Produces a classic "perfect maze" with 1-cell-wide corridors separated by
// 1-cell-wide walls. Algorithm: randomized recursive backtracker carving on
// a step-2 lattice. Optional braiding (dead-end removal) creates loops while
// preserving connectivity. The generator NEVER creates open chambers or
// blobs — open space is added manually by the designer afterwards.
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

  // Carving lattice: corridors live on cells where (col,row) are both odd,
  // walls on the in-between cells. This guarantees 1-cell corridors with
  // 1-cell walls between them — never open blobs. Origin snapped to (1,1).
  const oc = 1;
  const orow = 1;

  // Maximum odd index that still leaves a sealed outer wall.
  const maxOdd = size % 2 === 0 ? size - 3 : size - 2;

  const mazeNodes: { c: number; r: number }[] = [];
  for (let r = 1; r <= maxOdd; r += 2) {
    for (let c = 1; c <= maxOdd; c += 2) {
      mazeNodes.push({ c, r });
    }
  }

  const visited = new Uint8Array(total);
  const stack: { c: number; r: number }[] = [];
  let visitedNodes = 0;

  const visitNode = (node: { c: number; r: number }) => {
    const i = idx(node.c, node.r);
    if (visited[i]) return;
    visited[i] = 1;
    visitedNodes += 1;
    cells[i] = { type: "CORRIDOR" };
    stack.push(node);
  };

  if (mazeNodes.length) visitNode({ c: oc, r: orow });

  // Branching: higher values cause the carver to abandon its current path
  // more often, jumping back to an earlier stack frame and producing more
  // frequent junctions. Low values keep it depth-first (long winding
  // corridors with fewer junctions).
  const branchProb = params.branching / 100;

  const stepOffsets = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ] as const;

  while (visitedNodes < mazeNodes.length) {
    if (!stack.length) {
      // Safety net: if all active frontiers are exhausted but any odd-lattice
      // cell remains unvisited, reconnect to a neighboring visited node and
      // continue. A correct backtracker should rarely need this, but it keeps
      // the generation invariant explicit: every interior maze node is carved.
      const unvisited = mazeNodes.filter((n) => !visited[idx(n.c, n.r)]);
      const reconnectable = unvisited.filter((n) =>
        stepOffsets.some(([dc, dr]) => visited[idx(n.c + dc, n.r + dr)]),
      );
      const pool = reconnectable.length ? reconnectable : unvisited;
      const restart = pool[Math.floor(Math.random() * pool.length)];
      const links = stepOffsets
        .map(([dc, dr]) => ({ c: restart.c + dc, r: restart.r + dr }))
        .filter(
          (n) =>
            n.c >= 1 &&
            n.c <= maxOdd &&
            n.r >= 1 &&
            n.r <= maxOdd &&
            visited[idx(n.c, n.r)],
        );
      const link = links[Math.floor(Math.random() * links.length)];
      if (link) {
        cells[idx((restart.c + link.c) / 2, (restart.r + link.r) / 2)] = { type: "CORRIDOR" };
      }
      visitNode(restart);
      continue;
    }

    const activeIndex = stack.length > 1 && Math.random() < branchProb
      ? Math.floor(Math.random() * stack.length)
      : stack.length - 1;
    const cur = stack[activeIndex];
    const candidates = [
      { c: cur.c + 2, r: cur.r },
      { c: cur.c - 2, r: cur.r },
      { c: cur.c, r: cur.r + 2 },
      { c: cur.c, r: cur.r - 2 },
    ].filter(
      (n) =>
        n.c >= 1 &&
        n.c <= maxOdd &&
        n.r >= 1 &&
        n.r <= maxOdd &&
        !visited[idx(n.c, n.r)],
    );

    if (!candidates.length) {
      stack.splice(activeIndex, 1);
      continue;
    }

    // shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const next = candidates[0];
    cells[idx((cur.c + next.c) / 2, (cur.r + next.r) / 2)] = { type: "CORRIDOR" };
    visitNode(next);
  }

  // ----- Braiding (dead-end removal) -----
  // A "dead-end" is a corridor with exactly one corridor neighbor.
  // - High deadEnds => keep the perfect maze intact (many dead-ends).
  // - Low deadEnds  => remove most dead-ends by knocking out a wall to a
  //   neighboring corridor (creates loops, still connected, still 1-cell).
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
        // Pick a wall neighbor that bridges to another corridor on the far
        // side. Never open the outer-border walls.
        const bridges = neighborOffsets
          .map(([dc, dr]) => ({ c: c + dc, r: r + dr }))
          .filter(
            (n) =>
              n.c > 0 &&
              n.c < size - 1 &&
              n.r > 0 &&
              n.r < size - 1 &&
              cells[idx(n.c, n.r)].type === "WALL" &&
              isCorridor(n.c + (n.c - c), n.r + (n.r - r)),
          );
        if (!bridges.length) continue;
        const pick = bridges[Math.floor(Math.random() * bridges.length)];
        cells[idx(pick.c, pick.r)] = { type: "CORRIDOR" };
      }
    }
  }

  // ----- Final connectivity guarantee -----
  // Force the outer border to be wall by default. The designer can still
  // paint over border cells later (e.g. to place a door flush on the edge);
  // the connectivity check treats any non-WALL cell as walkable, so
  // designer-placed openings remain valid.
  for (let i = 0; i < size; i++) {
    cells[idx(i, 0)] = { type: "WALL" };
    cells[idx(i, size - 1)] = { type: "WALL" };
    cells[idx(0, i)] = { type: "WALL" };
    cells[idx(size - 1, i)] = { type: "WALL" };
  }

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
  { deadEnds: number; branching: number }
> = {
  // Simple: heavy braiding (few dead-ends) + low branching => open-feeling
  // perfect maze with long, easy routes.
  simple: { deadEnds: 20, branching: 20 },
  // Medium: moderate dead-ends, moderate branching.
  medium: { deadEnds: 55, branching: 50 },
  // Complex: keep most dead-ends + high branching => dense, twisty.
  complex: { deadEnds: 90, branching: 80 },
};