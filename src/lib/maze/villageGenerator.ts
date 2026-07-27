import type { CellState, CellType } from "./types";

export interface VillageParams {
  size: number;
  /** 1-10, Open -> Dense */
  density: number;
  /** 1-10, Small -> Large */
  buildingMix: number;
  /** 0-10, Symmetric -> Chaotic */
  chaos?: number;
  borderWall: boolean;
}

/** Cell types that represent deliberate designer intent and survive repopulation. */
export const PRESERVED_TYPES: CellType[] = [
  "NPC",
  "WHISPER",
  "LANDMARK",
  "BUILDING_23",
  "BUILDING_47",
  "BUILDING_89",
  "EYE",
];

type Size = { w: number; h: number; type: CellType };

function pickBuildingSize(mix: number): Size {
  const r = Math.random();
  let weights: [number, number, number]; // S, M, L
  if (mix <= 3) weights = [0.8, 0.15, 0.05];
  else if (mix <= 6) weights = [0.4, 0.4, 0.2];
  else weights = [0.15, 0.35, 0.5];

  if (r < weights[0]) return { w: 2, h: 2, type: "BUILDING_S" };
  if (r < weights[0] + weights[1]) return { w: 3, h: 3, type: "BUILDING_M" };
  // Large buildings vary: 4x4, 4x3, 3x4
  const v = Math.floor(Math.random() * 3);
  const dims = v === 0 ? [4, 4] : v === 1 ? [4, 3] : [3, 4];
  return { w: dims[0], h: dims[1], type: "BUILDING_L" };
}

function blockSizeFor(density: number): number {
  if (density <= 3) return 12 + Math.floor(Math.random() * 5); // 12-16
  if (density <= 6) return 8 + Math.floor(Math.random() * 3); // 8-10
  return 4 + Math.floor(Math.random() * 3); // 4-6
}

/**
 * Generates a village/city layout: forest border, street grid with roads and
 * square intersections, greedily packed building blocks, a reserved central
 * plaza with an EYE, and the three fixed special buildings.
 */
export function generateVillage(params: VillageParams): CellState[] {
  const { size, density, buildingMix, borderWall } = params;
  const chaos = Math.max(0, Math.min(10, params.chaos ?? 0));
  const k = chaos / 10;
  const total = size * size;
  const cells: CellState[] = new Array(total);
  for (let i = 0; i < total; i++) cells[i] = { type: "OPEN" };
  const idx = (c: number, r: number) => r * size + c;
  const set = (c: number, r: number, type: CellType) => {
    if (c < 0 || r < 0 || c >= size || r >= size) return;
    cells[idx(c, r)] = { type };
  };

  // ---- Step 1: forest border ----
  const border = borderWall ? 2 : 0;
  if (borderWall) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r < 2 || c < 2 || r >= size - 2 || c >= size - 2) set(c, r, "FOREST");
      }
    }
  }
  const min = border;
  const max = size - border - 1;
  const workSpan = max - min + 1;
  if (workSpan < 8) return cells;

  // ================= HIGH CHAOS (8-10): corridor carving =================
  if (chaos >= 8) {
    carveChaoticVillage({
      size,
      min,
      max,
      chaos,
      density,
      buildingMix,
      cells,
      idx,
      set,
    });
    ensureBuildingAccess(cells, size, min, max);
    return cells;
  }

  // ---- Step 2: street grid ----
  // Build street bands along both axes; block sizes vary with density.
  const bands = (): { start: number; width: number }[] => {
    const out: { start: number; width: number }[] = [];
    let pos = min;
    let majorCount = 0;
    while (pos < max) {
      const block = blockSizeFor(density);
      pos += block;
      if (pos >= max) break;
      majorCount++;
      let width = 2;
      if (density <= 3 && majorCount % 3 === 0) width = 3; // boulevards
      if (density >= 8 && Math.random() < 0.4) width = 1; // alleys
      out.push({ start: pos, width });
      pos += width;
    }
    return out;
  };

  const vBands = bands();
  const hBands = bands();

  // Chaos: per-band drift (smooth random walk) and occasional gaps along the run.
  const maxDrift = Math.round(k * 4);
  const shiftChance = k * 0.35;
  const gapChance = k * 0.25;

  type BandRun = { offset: number[]; open: boolean[] };
  const buildRuns = (bandList: { start: number; width: number }[]): BandRun[] =>
    bandList.map(() => {
      const offset: number[] = new Array(size).fill(0);
      const open: boolean[] = new Array(size).fill(true);
      let cur = 0;
      let steps = 0;
      let gapLeft = 0;
      let gapUsed = false;
      for (let i = 0; i < size; i++) {
        if (maxDrift > 0 && ++steps >= 3) {
          steps = 0;
          if (Math.random() < shiftChance) {
            const d = Math.random() < 0.5 ? -1 : 1;
            const nxt = cur + d;
            if (Math.abs(nxt) <= maxDrift) cur = nxt;
          }
        }
        offset[i] = cur;
        if (gapLeft > 0) {
          open[i] = false;
          gapLeft--;
        } else if (!gapUsed && gapChance > 0 && Math.random() < gapChance / size * 4) {
          gapUsed = true;
          gapLeft = 2 + Math.floor(Math.random() * 4);
          open[i] = false;
        }
      }
      return { offset, open };
    });

  const vRuns = buildRuns(vBands);
  const hRuns = buildRuns(hBands);

  const isVStreet = (c: number, r: number) =>
    vBands.some((b, i) => {
      const run = vRuns[i];
      if (!run.open[r]) return false;
      const s = b.start + run.offset[r];
      return c >= s && c < s + b.width;
    });
  const isHStreet = (r: number, c: number) =>
    hBands.some((b, i) => {
      const run = hRuns[i];
      if (!run.open[c]) return false;
      const s = b.start + run.offset[c];
      return r >= s && r < s + b.width;
    });

  for (let r = min; r <= max; r++) {
    for (let c = min; c <= max; c++) {
      const v = isVStreet(c, r);
      const h = isHStreet(r, c);
      if (v && h) set(c, r, "SQUARE");
      else if (v || h) set(c, r, "ROAD");
    }
  }

  // ---- Step 3: pack buildings into blocks ----
  const blockRanges = (bandList: { start: number; width: number }[]) => {
    const ranges: { a: number; b: number }[] = [];
    let cursor = min;
    for (const b of bandList) {
      if (b.start - 1 >= cursor) ranges.push({ a: cursor, b: b.start - 1 });
      cursor = b.start + b.width;
    }
    if (max >= cursor) ranges.push({ a: cursor, b: max });
    return ranges;
  };

  const colBlocks = blockRanges(vBands);
  const rowBlocks = blockRanges(hBands);
  const baseGap = density >= 8 ? (Math.random() < 0.5 ? 0 : 1) : 1;
  const skipChance = k * 0.3;
  const gapFor = () => {
    if (k === 0) return baseGap;
    const extra = Math.random() < k * 0.5 ? Math.floor(Math.random() * (1 + Math.round(k * 2))) : 0;
    return baseGap + extra;
  };

  const areaFree = (c0: number, r0: number, w: number, h: number) => {
    for (let r = r0; r < r0 + h; r++) {
      for (let c = c0; c < c0 + w; c++) {
        if (cells[idx(c, r)].type !== "OPEN") return false;
      }
    }
    return true;
  };

  for (const cb of colBlocks) {
    for (const rb of rowBlocks) {
      // leave a 1-cell gap between buildings and streets
      const c0 = cb.a + 1;
      const c1 = cb.b - 1;
      const r0 = rb.a + 1;
      const r1 = rb.b - 1;
      if (c1 - c0 < 1 || r1 - r0 < 1) continue;

      let y = r0;
      while (y <= r1) {
        let x = c0;
        let tallest = 0;
        while (x <= c1) {
          // Try the rolled size, then shrink to whatever fits.
          const rolled = pickBuildingSize(buildingMix);
          const options: Size[] = [
            rolled,
            { w: 3, h: 3, type: "BUILDING_M" },
            { w: 2, h: 2, type: "BUILDING_S" },
          ];
          const fit = options.find(
            (o) => x + o.w - 1 <= c1 && y + o.h - 1 <= r1 && areaFree(x, y, o.w, o.h),
          );
          if (!fit) {
            x += 1;
            continue;
          }
          if (skipChance > 0 && Math.random() < skipChance) {
            x += 1 + Math.floor(Math.random() * 2);
            continue;
          }
          for (let r = y; r < y + fit.h; r++) {
            for (let c = x; c < x + fit.w; c++) set(c, r, fit.type);
          }
          tallest = Math.max(tallest, fit.h);
          x += fit.w + gapFor();
        }
        if (tallest === 0) break;
        y += tallest + gapFor();
      }
    }
  }

  ensureBuildingAccess(cells, size, min, max);

  return cells;
}

const BUILDING_TYPES: CellType[] = ["BUILDING_S", "BUILDING_M", "BUILDING_L"];
const STREET_TYPES: CellType[] = ["ROAD", "SQUARE"];

/**
 * Final validation pass (runs at every chaos level): every contiguous building
 * cluster must touch at least one ROAD or SQUARE cell orthogonally. Clusters
 * that don't get a 1-wide connector carved to the nearest street, preferring to
 * cut through OPEN space and only sacrificing building cells when unavoidable.
 */
function ensureBuildingAccess(cells: CellState[], size: number, min: number, max: number) {
  const idx = (c: number, r: number) => r * size + c;
  const inWork = (c: number, r: number) => c >= min && c <= max && r >= min && r <= max;
  const isBuilding = (i: number) => BUILDING_TYPES.includes(cells[i].type);
  const isStreet = (i: number) => STREET_TYPES.includes(cells[i].type);
  const DIRS: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const seen = new Uint8Array(size * size);

  for (let r = min; r <= max; r++) {
    for (let c = min; c <= max; c++) {
      const start = idx(c, r);
      if (seen[start] || !isBuilding(start)) continue;
      const type = cells[start].type;

      // Flood the contiguous same-type cluster.
      const cluster: { c: number; r: number }[] = [];
      const queue = [{ c, r }];
      seen[start] = 1;
      let touchesStreet = false;
      while (queue.length) {
        const cur = queue.pop()!;
        cluster.push(cur);
        for (const [dc, dr] of DIRS) {
          const nc = cur.c + dc;
          const nr = cur.r + dr;
          if (!inWork(nc, nr)) continue;
          const ni = idx(nc, nr);
          if (isStreet(ni)) touchesStreet = true;
          if (!seen[ni] && cells[ni].type === type) {
            seen[ni] = 1;
            queue.push({ c: nc, r: nr });
          }
        }
      }
      if (touchesStreet) continue;

      carveConnector(cluster);
    }
  }

  function carveConnector(cluster: { c: number; r: number }[]) {
    // Dijkstra outward from the cluster; OPEN cells are cheap, buildings costly,
    // anything else (forest / interactive) is impassable.
    const INF = Number.POSITIVE_INFINITY;
    const dist = new Float64Array(size * size).fill(INF);
    const prev = new Int32Array(size * size).fill(-1);
    const frontier: number[] = [];
    const clusterSet = new Set(cluster.map((p) => idx(p.c, p.r)));

    for (const p of cluster) {
      const i = idx(p.c, p.r);
      dist[i] = 0;
      frontier.push(i);
    }

    const costOf = (i: number): number | null => {
      const t = cells[i].type;
      if (STREET_TYPES.includes(t)) return 0;
      if (t === "OPEN") return 1;
      if (BUILDING_TYPES.includes(t)) return 6;
      return null; // forest, plaza-less specials, interactives: don't disturb
    };

    let target = -1;
    while (frontier.length) {
      let bestPos = 0;
      for (let k = 1; k < frontier.length; k++) {
        if (dist[frontier[k]] < dist[frontier[bestPos]]) bestPos = k;
      }
      const cur = frontier.splice(bestPos, 1)[0];
      if (isStreet(cur) && !clusterSet.has(cur)) {
        target = cur;
        break;
      }
      const cc = cur % size;
      const cr = (cur - cc) / size;
      for (const [dc, dr] of DIRS) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (!inWork(nc, nr)) continue;
        const ni = idx(nc, nr);
        const cost = costOf(ni);
        if (cost === null) continue;
        const nd = dist[cur] + cost;
        if (nd < dist[ni]) {
          dist[ni] = nd;
          prev[ni] = cur;
          frontier.push(ni);
        }
      }
    }

    if (target < 0) return;

    // Walk back and convert everything between the street and the cluster edge.
    let node = prev[target];
    while (node >= 0 && !clusterSet.has(node)) {
      cells[node] = { type: "ROAD" };
      node = prev[node];
    }
    // If the connector ends flush against a cluster cell we're done; otherwise
    // sacrifice that one cluster cell so the building has a road-facing side.
    if (node >= 0 && cluster.length > 1) {
      const stillBlocked = !DIRS.some(([dc, dr]) => {
        const nc = (node % size) + dc;
        const nr = (node - (node % size)) / size + dr;
        return inWork(nc, nr) && isStreet(idx(nc, nr));
      });
      if (stillBlocked) cells[node] = { type: "ROAD" };
    }
  }
}

interface ChaoticArgs {
  size: number;
  min: number;
  max: number;
  chaos: number;
  density: number;
  buildingMix: number;
  cells: CellState[];
  idx: (c: number, r: number) => number;
  set: (c: number, r: number, type: CellType) => void;
}

/**
 * Chaos 8-10: abandon straight bands entirely. Streets are carved by randomized
 * walkers (turn + branch probabilities rising toward chaos 10) until a target
 * coverage is met, then buildings are packed greedily into whatever open
 * pockets remain, regardless of pocket shape.
 */
function carveChaoticVillage(a: ChaoticArgs) {
  const { size, min, max, chaos, density, buildingMix, cells, idx, set } = a;
  const span = max - min + 1;
  const t = (chaos - 8) / 2; // 0 at chaos 8, 1 at chaos 10

  const turnChance = 0.3 + t * 0.4; // 0.30 -> 0.70
  const branchChance = 0.05 + t * 0.12; // 0.05 -> 0.17
  const targetCoverage = 0.16 + density * 0.018; // ~0.18 - 0.34
  const targetCells = Math.floor(span * span * targetCoverage);

  const street = new Uint8Array(size * size);
  let carved = 0;

  const inWork = (c: number, r: number) => c >= min && c <= max && r >= min && r <= max;
  const mark = (c: number, r: number) => {
    if (!inWork(c, r)) return;
    const i = idx(c, r);
    if (street[i]) return;
    street[i] = 1;
    carved++;
  };

  const DIRS: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  type Walker = { c: number; r: number; d: [number, number]; life: number; wide: boolean };
  const stack: Walker[] = [];

  const seedCount = 3 + Math.floor(span / 22) + Math.floor(t * 3);
  const seedAt = (c: number, r: number, wide: boolean) =>
    stack.push({
      c,
      r,
      d: DIRS[Math.floor(Math.random() * 4)],
      life: Math.floor(span * (1.2 + Math.random())),
      wide,
    });

  // Seeds: plaza edges plus scattered points, so the centre stays reachable.
  seedAt(Math.floor(size / 2), Math.floor(size / 2) - 6, true);
  seedAt(Math.floor(size / 2), Math.floor(size / 2) + 6, true);
  seedAt(Math.floor(size / 2) - 6, Math.floor(size / 2), true);
  seedAt(Math.floor(size / 2) + 6, Math.floor(size / 2), true);
  for (let s = 0; s < seedCount; s++) {
    const c = min + Math.floor(Math.random() * span);
    const r = min + Math.floor(Math.random() * span);
    seedAt(c, r, Math.random() < 0.4);
  }

  let guard = span * span * 8;
  while (stack.length && carved < targetCells && guard-- > 0) {
    const w = stack[stack.length - 1];
    if (w.life <= 0) {
      stack.pop();
      continue;
    }
    if (Math.random() < turnChance) {
      const perp: [number, number][] = w.d[0] !== 0 ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
      w.d = perp[Math.floor(Math.random() * 2)];
    }
    const steps = 1 + Math.floor(Math.random() * 3);
    for (let s = 0; s < steps; s++) {
      const nc = w.c + w.d[0];
      const nr = w.r + w.d[1];
      if (!inWork(nc, nr)) {
        // bounce off the border rather than dying at it
        w.d = [-w.d[0], -w.d[1]];
        break;
      }
      w.c = nc;
      w.r = nr;
      mark(w.c, w.r);
      if (w.wide) {
        if (w.d[0] !== 0) mark(w.c, w.r + 1);
        else mark(w.c + 1, w.r);
      }
      w.life--;
    }
    if (stack.length < 40 && Math.random() < branchChance) {
      seedAt(w.c, w.r, Math.random() < 0.3);
    }
    // Occasional dead end: retire the walker early.
    if (Math.random() < 0.02 + t * 0.05) w.life -= Math.floor(span * 0.3);
  }

  // Paint streets; junctions (3+ street neighbours) become SQUARE.
  for (let r = min; r <= max; r++) {
    for (let c = min; c <= max; c++) {
      if (!street[idx(c, r)]) continue;
      let n = 0;
      for (const [dc, dr] of DIRS) {
        const cc = c + dc;
        const rr = r + dr;
        if (inWork(cc, rr) && street[idx(cc, rr)]) n++;
      }
      set(c, r, n >= 3 ? "SQUARE" : "ROAD");
    }
  }

  // Pack buildings greedily into open pockets of any shape.
  const areaFree = (c0: number, r0: number, w: number, h: number) => {
    for (let r = r0; r < r0 + h; r++) {
      for (let c = c0; c < c0 + w; c++) {
        if (!inWork(c, r)) return false;
        if (cells[idx(c, r)].type !== "OPEN") return false;
      }
    }
    return true;
  };

  const gapChanceLocal = 0.25 + t * 0.2;
  for (let r = min; r <= max; r++) {
    for (let c = min; c <= max; c++) {
      if (cells[idx(c, r)].type !== "OPEN") continue;
      if (Math.random() < gapChanceLocal) continue;
      const rolled = pickBuildingSize(buildingMix);
      const options: Size[] = [
        rolled,
        { w: 3, h: 3, type: "BUILDING_M" },
        { w: 2, h: 2, type: "BUILDING_S" },
      ];
      const fit = options.find((o) => areaFree(c, r, o.w, o.h));
      if (!fit) continue;
      for (let rr = r; rr < r + fit.h; rr++) {
        for (let cc = c; cc < c + fit.w; cc++) set(cc, rr, fit.type);
      }
    }
  }
}

/** Overlay preserved designer cells from a previous layout onto a new one. */
export function preserveManual(prev: CellState[], next: CellState[]): CellState[] {
  const out = next.slice();
  for (let i = 0; i < prev.length && i < out.length; i++) {
    if (PRESERVED_TYPES.includes(prev[i].type)) out[i] = prev[i];
  }
  return out;
}
