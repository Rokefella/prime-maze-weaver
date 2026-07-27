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

  // ---- Step 4 (reserved first): central plaza kept OPEN ----
  const centerC = Math.floor(size / 2);
  const centerR = Math.floor(size / 2);
  const plaza = {
    c0: centerC - 5,
    c1: centerC + 4,
    r0: centerR - 5,
    r1: centerR + 4,
  };
  const inPlaza = (c: number, r: number) =>
    c >= plaza.c0 && c <= plaza.c1 && r >= plaza.r0 && r <= plaza.r1;

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

  const isVStreet = (c: number) => vBands.some((b) => c >= b.start && c < b.start + b.width);
  const isHStreet = (r: number) => hBands.some((b) => r >= b.start && r < b.start + b.width);

  for (let r = min; r <= max; r++) {
    for (let c = min; c <= max; c++) {
      if (inPlaza(c, r)) continue;
      const v = isVStreet(c);
      const h = isHStreet(r);
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
  const gap = density >= 8 ? (Math.random() < 0.5 ? 0 : 1) : 1;

  const areaFree = (c0: number, r0: number, w: number, h: number) => {
    for (let r = r0; r < r0 + h; r++) {
      for (let c = c0; c < c0 + w; c++) {
        if (inPlaza(c, r)) return false;
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
          for (let r = y; r < y + fit.h; r++) {
            for (let c = x; c < x + fit.w; c++) set(c, r, fit.type);
          }
          tallest = Math.max(tallest, fit.h);
          x += fit.w + gap;
        }
        if (tallest === 0) break;
        y += tallest + gap;
      }
    }
  }

  // ---- Step 4b: EYE at exact grid center ----
  set(centerC, centerR, "EYE");

  // ---- Step 5: special buildings at fixed offsets (4x3 each) ----
  const special: { type: CellType; c: number; r: number }[] = [
    { type: "BUILDING_23", c: centerC - 8, r: centerR },
    { type: "BUILDING_47", c: centerC + 8, r: centerR },
    { type: "BUILDING_89", c: centerC, r: centerR - 8 },
  ];
  for (const s of special) {
    const c0 = Math.max(0, Math.min(size - 4, s.c - 2));
    const r0 = Math.max(0, Math.min(size - 3, s.r - 1));
    for (let r = r0; r < r0 + 3; r++) {
      for (let c = c0; c < c0 + 4; c++) set(c, r, s.type);
    }
  }

  return cells;
}

/** Overlay preserved designer cells from a previous layout onto a new one. */
export function preserveManual(prev: CellState[], next: CellState[]): CellState[] {
  const out = next.slice();
  for (let i = 0; i < prev.length && i < out.length; i++) {
    if (PRESERVED_TYPES.includes(prev[i].type)) out[i] = prev[i];
  }
  return out;
}
