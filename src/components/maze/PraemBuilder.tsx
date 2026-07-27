import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { GridCanvas, type GridCanvasHandle } from "./GridCanvas";
import { buildUlamData } from "@/lib/maze/ulam";
import { generateMaze, PRESETS, computeReachable, findOrigin } from "@/lib/maze/generator";
import { suggestFragmentCells } from "@/lib/maze/fragments";
import { generateVillage, preserveManual } from "@/lib/maze/villageGenerator";
import {
  exportLevel,
  importLevel,
  downloadJson,
} from "@/lib/maze/storage";
import {
  listBuilderLevels,
  upsertBuilderLevel,
  deleteBuilderLevel,
  publishLevel,
  type LevelStatus,
} from "@/lib/maze/supabaseLibrary";
import type {
  BuilderMode,
  CellState,
  CellType,
  LevelMeta,
  SavedLevel,
  ExportedLevel,
} from "@/lib/maze/types";
import { CELL_LABELS, PALETTE, swatchFor, PRAEM_CHARACTERS } from "@/lib/maze/palette";

const CHAR_SELECT_STYLE: React.CSSProperties = {
  background: "#0d0d1a",
  border: "0.5px solid rgba(100,80,160,0.4)",
  color: "#e0ddd5",
  fontFamily: "var(--font-display, 'Cinzel', serif)",
  fontSize: "11px",
  letterSpacing: "0.1em",
  padding: "4px 6px",
  width: "100%",
  borderRadius: "4px",
};

const MAZE_TOOLS: { type: CellType; swatch: string; label: string }[] = [
  { type: "CORRIDOR", swatch: PALETTE.corridor, label: CELL_LABELS.CORRIDOR },
  { type: "WALL", swatch: PALETTE.wall, label: CELL_LABELS.WALL },
  { type: "FRAGMENT", swatch: PALETTE.fragment, label: CELL_LABELS.FRAGMENT },
  { type: "START", swatch: PALETTE.start, label: CELL_LABELS.START },
  { type: "GOLDEN_DOOR", swatch: PALETTE.goldenDoor, label: CELL_LABELS.GOLDEN_DOOR },
  { type: "BLUE_DOOR", swatch: PALETTE.blueDoor, label: CELL_LABELS.BLUE_DOOR },
  { type: "DOOR_TO_ROOM", swatch: PALETTE.doorToRoom, label: CELL_LABELS.DOOR_TO_ROOM },
  { type: "NPC", swatch: PALETTE.npc, label: CELL_LABELS.NPC },
  { type: "VEIL", swatch: PALETTE.veil, label: CELL_LABELS.VEIL },
  { type: "DROP", swatch: PALETTE.drop, label: CELL_LABELS.DROP },
];

const VILLAGE_TYPES: CellType[] = [
  "OPEN",
  "SQUARE",
  "ROAD",
  "PATH",
  "BUILDING_S",
  "BUILDING_M",
  "BUILDING_L",
  "BUILDING_23",
  "BUILDING_47",
  "BUILDING_89",
  "FOREST",
  "NPC",
  "WHISPER",
  "LANDMARK",
  "EYE",
];

const SHADOW_TYPES: CellType[] = [
  "OPEN",
  "PATH",
  "GHOST_ZONE",
  "WALL",
  "EYE",
  "TRANSFER_POINT",
  "NPC",
  "DROP",
];

function toolsForMode(mode: BuilderMode) {
  if (mode === "maze") return MAZE_TOOLS;
  const list = mode === "village" ? VILLAGE_TYPES : SHADOW_TYPES;
  return list.map((type) => ({
    type,
    swatch: swatchFor(type, mode),
    label: CELL_LABELS[type] ?? type,
  }));
}

const MODES: { key: BuilderMode; label: string; color: string }[] = [
  { key: "maze", label: "Maze", color: "#b87bff" },
  { key: "village", label: "Village", color: "#8a6a1f" },
  { key: "shadow_realm", label: "Shadow", color: "#a78bfa" },
];

const WALKABLE_FOR_ROUTE: Record<string, true> = {
  CORRIDOR: true,
  FRAGMENT: true,
  START: true,
  GOLDEN_DOOR: true,
  BLUE_DOOR: true,
  DOOR_TO_ROOM: true,
  NPC: true,
  DROP: true,
  OPEN: true,
  PATH: true,
  EYE: true,
  TRANSFER_POINT: true,
  GHOST_ZONE: true,
  SQUARE: true,
  ROAD: true,
  LANDMARK: true,
  WHISPER: true,
};

function bfsPath(
  cells: CellState[],
  size: number,
  a: { col: number; row: number },
  b: { col: number; row: number },
): number[] | null {
  const isOpen = (i: number) => WALKABLE_FOR_ROUTE[cells[i].type] === true;
  const start = a.row * size + a.col;
  const goal = b.row * size + b.col;
  if (!isOpen(start) || !isOpen(goal)) return null;
  if (start === goal) return [start];
  const total = size * size;
  const prev = new Int32Array(total).fill(-1);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qh = 0, qt = 0;
  queue[qt++] = start;
  visited[start] = 1;
  while (qh < qt) {
    const cur = queue[qh++];
    if (cur === goal) break;
    const cr = (cur / size) | 0;
    const cc = cur - cr * size;
    // 4-dir
    if (cc > 0) { const n = cur - 1; if (!visited[n] && isOpen(n)) { visited[n] = 1; prev[n] = cur; queue[qt++] = n; } }
    if (cc < size - 1) { const n = cur + 1; if (!visited[n] && isOpen(n)) { visited[n] = 1; prev[n] = cur; queue[qt++] = n; } }
    if (cr > 0) { const n = cur - size; if (!visited[n] && isOpen(n)) { visited[n] = 1; prev[n] = cur; queue[qt++] = n; } }
    if (cr < size - 1) { const n = cur + size; if (!visited[n] && isOpen(n)) { visited[n] = 1; prev[n] = cur; queue[qt++] = n; } }
  }
  if (!visited[goal]) return null;
  const path: number[] = [];
  for (let n = goal; n !== -1; n = prev[n]) {
    path.push(n);
    if (n === start) break;
  }
  path.reverse();
  return path;
}

function makeBlankCells(size: number, mode: BuilderMode = "maze"): CellState[] {
  const total = size * size;
  const cells: CellState[] = new Array(total);
  const base: CellType = mode === "maze" ? "CORRIDOR" : "OPEN";
  for (let i = 0; i < total; i++) cells[i] = { type: base };
  return cells;
}

function defaultMeta(): LevelMeta {
  return { levelNumber: 1, levelName: "Untitled", requiredFragments: 0, notes: "", mode: "maze" };
}

interface Flash {
  msg: string;
  tone: "info" | "warn";
}

interface PendingDoor {
  col: number;
  row: number;
  roomId: string;
  awaitingReentry: boolean;
}
interface PendingNpc {
  col: number;
  row: number;
  name: string;
}

const PROP_TYPES: CellType[] = [
  "NPC",
  "BUILDING_23",
  "BUILDING_47",
  "BUILDING_89",
  "LANDMARK",
];

/** Shadow realm population: ghost zones, border and a central transfer point. */
function generateShadowRealm(opts: {
  size: number;
  density: number;
  atmosphere: number;
  border: boolean;
  prev: CellState[];
}): CellState[] {
  const { size, density, atmosphere, border, prev } = opts;
  const total = size * size;
  const cells: CellState[] = new Array(total);
  for (let i = 0; i < total; i++) cells[i] = { type: "OPEN" };
  const idx = (c: number, r: number) => r * size + c;
  const inB = (c: number, r: number) => c >= 0 && r >= 0 && c < size && r < size;
  const set = (c: number, r: number, type: CellType) => {
    if (inB(c, r)) cells[idx(c, r)] = { type };
  };

  // Step 1 — border
  if (border) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r < 2 || c < 2 || r >= size - 2 || c >= size - 2) set(c, r, "GHOST_ZONE");
      }
    }
  }

  const cc = Math.floor(size / 2);
  const cr = Math.floor(size / 2);

  // Step 3 — ghost zones (before clearing the centre so it stays accessible)
  const t = (density + atmosphere) / 2; // 1..10
  const coverage = t <= 3.5 ? 0.175 : t <= 7 ? 0.35 : 0.65;
  const clusterMax = t <= 3.5 ? 3 : t <= 7 ? 6 : 10;
  const guard = t <= 3.5 ? 5 : t <= 7 ? 4 : 3; // half-size of protected centre area
  const marginLo = border ? 2 : 0;
  const marginHi = size - 1 - marginLo;
  const fieldArea = Math.max(1, (marginHi - marginLo + 1) ** 2);
  const target = Math.floor(fieldArea * coverage);
  const nearCentre = (c: number, r: number) =>
    Math.abs(c - cc) <= guard && Math.abs(r - cr) <= guard;

  let placed = 0;
  let attempts = 0;
  while (placed < target && attempts < target * 40) {
    attempts++;
    let c = marginLo + Math.floor(Math.random() * (marginHi - marginLo + 1));
    let r = marginLo + Math.floor(Math.random() * (marginHi - marginLo + 1));
    if (nearCentre(c, r)) continue;
    const clusterSize = 2 + Math.floor(Math.random() * clusterMax);
    for (let k = 0; k < clusterSize; k++) {
      if (!inB(c, r) || nearCentre(c, r)) break;
      if (c < marginLo || r < marginLo || c > marginHi || r > marginHi) break;
      if (cells[idx(c, r)].type !== "GHOST_ZONE") {
        set(c, r, "GHOST_ZONE");
        placed++;
      }
      const d = Math.floor(Math.random() * 4);
      c += d === 0 ? 1 : d === 1 ? -1 : 0;
      r += d === 2 ? 1 : d === 3 ? -1 : 0;
    }
  }

  // Step 2 — transfer point at exact centre with a clear 3x3 around it
  for (let r = cr - 1; r <= cr + 1; r++) {
    for (let c = cc - 1; c <= cc + 1; c++) set(c, r, "OPEN");
  }
  set(cc, cr, "TRANSFER_POINT");

  // Step 4 — preserve manual NPCs
  for (let i = 0; i < prev.length && i < total; i++) {
    if (prev[i].type === "NPC") cells[i] = prev[i];
  }

  return cells;
}

export function PraemBuilder() {
  const [size, setSize] = useState(30);
  const ulam = useMemo(() => buildUlamData(size), [size]);
  const [cells, setCells] = useState<CellState[]>(() => makeBlankCells(30));
  const [tool, setTool] = useState<CellType>("WALL");
  const [showNumbers, setShowNumbers] = useState(false);
  const [meta, setMeta] = useState<LevelMeta>(defaultMeta);
  const [deadEnds, setDeadEnds] = useState(50);
  const [branching, setBranching] = useState(50);
  const [numFragments, setNumFragments] = useState(5);
  const [library, setLibrary] = useState<SavedLevel[]>([]);
  const [highlight, setHighlight] = useState<{ col: number; row: number } | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [pendingDoor, setPendingDoor] = useState<PendingDoor | null>(null);
  const [pendingNpc, setPendingNpc] = useState<PendingNpc | null>(null);
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState<LevelStatus>("draft");
  const [rotation, setRotation] = useState<0 | 1 | 3>(0); // 0=Purple, 1=Amber CCW, 3=Teal CW
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [routeMode, setRouteMode] = useState(false);
  const [routeA, setRouteA] = useState<{ col: number; row: number } | null>(null);
  const [routeB, setRouteB] = useState<{ col: number; row: number } | null>(null);
  const [paintMode, setPaintMode] = useState<"cell" | "rect">("cell");
  const [rectStart, setRectStart] = useState<{ col: number; row: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);
  const [propName, setPropName] = useState(PRAEM_CHARACTERS[0] as string);

  const [vDensity, setVDensity] = useState(5);
  const [vMix, setVMix] = useState(5);
  const [vChaos, setVChaos] = useState(0);
  const [vBorder, setVBorder] = useState(true);
  const [sDensity, setSDensity] = useState(4);
  const [sAtmosphere, setSAtmosphere] = useState(5);
  const [sBorder, setSBorder] = useState(true);

  const gridRef = useRef<GridCanvasHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mode = meta.mode ?? "maze";
  const tools = useMemo(() => toolsForMode(mode), [mode]);

  useEffect(() => {
    // Keep the active tool valid for the current mode.
    if (!tools.some((t) => t.type === tool)) setTool(tools[0].type);
  }, [tools, tool]);

  const changeMode = (next: BuilderMode) => {
    if (next === mode) return;
    if (manuallyEdited && !confirm("Switching mode clears the current layout. Continue?")) return;
    setMeta((m) => ({ ...m, mode: next }));
    setCells(makeBlankCells(size, next));
    setManuallyEdited(false);
    setPendingDoor(null);
    setPendingNpc(null);
    setHighlight(null);
    setRotation(0);
    clearRoute();
  };

  const routeResult = useMemo(() => {
    if (!routeA || !routeB) return null;
    const path = bfsPath(cells, size, routeA, routeB);
    if (!path) return { path: null as number[] | null, set: null as Set<number> | null, steps: -1 };
    return { path, set: new Set(path), steps: path.length - 1 };
  }, [routeA, routeB, cells, size]);

  const clearRoute = () => {
    setRouteA(null);
    setRouteB(null);
  };

  useEffect(() => {
    refreshLibrary();
  }, []);

  const refreshLibrary = async () => {
    try {
      const lib = await listBuilderLevels();
      setLibrary(lib);
    } catch (err) {
      console.error(err);
      setFlash({ msg: "Failed to load library.", tone: "warn" });
    }
  };

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  // When size changes, reset cells to blank.
  const resizeGrid = (newSize: number) => {
    if (manuallyEdited) {
      if (!confirm("Changing grid size will clear the current layout. Continue?")) {
        return;
      }
    }
    setSize(newSize);
    setCells(makeBlankCells(newSize, mode));
    setManuallyEdited(false);
    setPendingDoor(null);
    setPendingNpc(null);
  };

  const onCellClick = useCallback(
    (col: number, row: number, e: { button: number; shiftKey: boolean }) => {
      const idx = row * size + col;

      const makeCell = (): CellState => {
        const base: CellState = { type: tool };
        if (PROP_TYPES.includes(tool)) {
          if (tool === "NPC" || tool === "LANDMARK") {
            if (propName.trim()) base.npc = { name: propName.trim() };
          }
        }
        return base;
      };

      // Route mode intercepts clicks: A -> B -> reset cycle. Right-click clears route.
      if (routeMode) {
        if (e.button === 2) {
          setRouteA(null);
          setRouteB(null);
          return;
        }
        if (!routeA) {
          setRouteA({ col, row });
          setRouteB(null);
        } else if (!routeB) {
          setRouteB({ col, row });
        } else {
          // Third click: reset and start a new A
          setRouteA({ col, row });
          setRouteB(null);
        }
        return;
      }

      // Right-click clears to corridor
      if (e.button === 2) {
        setRectStart(null);
        setCells((prev) => {
          const next = prev.slice();
          next[idx] = { type: mode === "maze" ? "CORRIDOR" : "OPEN" };
          return next;
        });
        setManuallyEdited(true);
        return;
      }

      // Awaiting reentry pick for a pending door
      if (pendingDoor?.awaitingReentry) {
        const pd = pendingDoor;
        setPendingDoor(null);
        setCells((prev) => {
          const next = prev.slice();
          next[pd.row * size + pd.col] = {
            type: "DOOR_TO_ROOM",
            door: {
              roomId: pd.roomId,
              reentry: { col, row },
            },
          };
          return next;
        });
        setFlash({ msg: `Door reentry set at (${col},${row})`, tone: "info" });
        setManuallyEdited(true);
        return;
      }

      // Tool-based placement
      if (tool === "FRAGMENT") {
        if (!ulam.isPrime[idx]) {
          setFlash({ msg: "Fragments can only be placed on prime (gold) cells.", tone: "warn" });
          return;
        }
      }

      // Rectangle fill
      if (paintMode === "rect") {
        if (!rectStart) {
          setRectStart({ col, row });
          return;
        }
        const c0 = Math.min(rectStart.col, col);
        const c1 = Math.max(rectStart.col, col);
        const r0 = Math.min(rectStart.row, row);
        const r1 = Math.max(rectStart.row, row);
        setCells((prev) => {
          const next = prev.slice();
          for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
              if (tool === "FRAGMENT" && !ulam.isPrime[r * size + c]) continue;
              next[r * size + c] = makeCell();
            }
          }
          return next;
        });
        setRectStart(null);
        setManuallyEdited(true);
        setFlash({ msg: `Filled ${(c1 - c0 + 1) * (r1 - r0 + 1)} cells.`, tone: "info" });
        return;
      }

      if (tool === "DOOR_TO_ROOM") {
        // Open inline form
        setPendingDoor({ col, row, roomId: "", awaitingReentry: false });
        return;
      }

      if (tool === "NPC" && mode === "maze") {
        setPendingNpc({ col, row, name: PRAEM_CHARACTERS[0] });
        return;
      }

      // Unique-cell tools: clear previous occurrence
      setCells((prev) => {
        const next = prev.slice();
        if (tool === "START" || tool === "GOLDEN_DOOR" || tool === "BLUE_DOOR") {
          for (let i = 0; i < next.length; i++) {
            if (next[i].type === tool) next[i] = { type: "CORRIDOR" };
          }
        }
        next[idx] = makeCell();
        return next;
      });
      setManuallyEdited(true);
    },
    [tool, size, ulam, pendingDoor, routeMode, routeA, routeB, mode, paintMode, rectStart, propName],
  );

  const runGenerate = () => {
    if (manuallyEdited && confirm("Regenerate base layout? This will overwrite your manual edits.") === false) {
      return;
    }
    const next = generateMaze({ size, deadEnds, branching });
    setCells(next);
    setManuallyEdited(false);
    setFlash({ msg: "Layout generated.", tone: "info" });
  };

  const applyPreset = (k: "simple" | "medium" | "complex") => {
    const p = PRESETS[k];
    setDeadEnds(p.deadEnds);
    setBranching(p.branching);
  };

  const runPopulate = (density = vDensity, mix = vMix, chaos = vChaos) => {
    const generated = generateVillage({
      size,
      density,
      buildingMix: mix,
      chaos,
      borderWall: vBorder,
    });
    setCells((prev) => preserveManual(prev, generated));
    setManuallyEdited(true);
    setFlash({ msg: "Village populated.", tone: "info" });
  };

  const clearVillage = () => {
    setCells(makeBlankCells(size, "village"));
    setManuallyEdited(false);
    setFlash({ msg: "Cleared to open ground.", tone: "info" });
  };

  const randomisePopulate = () => {
    const jitter = () => (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
    const d = Math.max(1, Math.min(10, vDensity + jitter()));
    const m = Math.max(1, Math.min(10, vMix + jitter()));
    const ch = Math.max(0, Math.min(10, vChaos + jitter()));
    setVDensity(d);
    setVMix(m);
    setVChaos(ch);
    runPopulate(d, m, ch);
  };

  const runShadowPopulate = (density = sDensity, atmosphere = sAtmosphere) => {
    const next = generateShadowRealm({
      size,
      density,
      atmosphere,
      border: sBorder,
      prev: cells,
    });
    setCells(next);
    setManuallyEdited(true);
    setFlash({ msg: "Shadow realm populated.", tone: "info" });
  };

  const clearShadow = () => {
    setCells((prev) => {
      const next = makeBlankCells(size, "shadow_realm");
      for (let i = 0; i < prev.length && i < next.length; i++) {
        if (prev[i].type === "NPC" || prev[i].type === "TRANSFER_POINT") next[i] = prev[i];
      }
      return next;
    });
    setManuallyEdited(false);
    setFlash({ msg: "Cleared to open ground.", tone: "info" });
  };

  const randomiseShadow = () => {
    const jitter = () => (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
    const d = Math.max(1, Math.min(10, sDensity + jitter()));
    const a = Math.max(1, Math.min(10, sAtmosphere + jitter()));
    setSDensity(d);
    setSAtmosphere(a);
    runShadowPopulate(d, a);
  };

  const suggestFragments = () => {
    const origin = findOrigin(cells, size);
    const reach = origin ? computeReachable(cells, size, origin) : undefined;
    const picks = suggestFragmentCells(ulam, numFragments, reach);
    if (picks.length === 0) {
      setFlash({ msg: "No reachable prime cells available.", tone: "warn" });
      return;
    }
    setCells((prev) => {
      const next = prev.slice();
      // Clear existing fragments first
      for (let i = 0; i < next.length; i++) {
        if (next[i].type === "FRAGMENT") next[i] = { type: "CORRIDOR" };
      }
      for (const p of picks) {
        const i = p.row * size + p.col;
        // Don't overwrite start/doors/npc
        const cur = next[i].type;
        if (cur === "START" || cur === "GOLDEN_DOOR" || cur === "BLUE_DOOR" || cur === "DOOR_TO_ROOM" || cur === "NPC") continue;
        next[i] = { type: "FRAGMENT" };
      }
      return next;
    });
    setManuallyEdited(true);
    setFlash({ msg: `Placed ${picks.length} fragments.`, tone: "info" });
  };

  const newLevel = () => {
    if (manuallyEdited && !confirm("Discard current level and start fresh?")) return;
    setCells(makeBlankCells(size, mode));
    setMeta({ ...defaultMeta(), mode });
    setManuallyEdited(false);
    setPendingDoor(null);
    setPendingNpc(null);
    setHighlight(null);
    setCurrentId(null);
    setStatus("draft");
  };

  const saveToLibrary = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = exportLevel(cells, ulam, meta);
      const id = await upsertBuilderLevel({ id: currentId, data, status });
      setCurrentId(id);
      await refreshLibrary();
      setFlash({ msg: `Saved "${meta.levelName}".`, tone: "info" });
    } catch (err) {
      console.error(err);
      setFlash({ msg: "Save failed.", tone: "warn" });
    } finally {
      setSaving(false);
    }
  };

  const loadFromLibrary = (sl: SavedLevel) => {
    const { cells: c, meta: m, size: s } = importLevel(sl.data);
    setSize(s);
    setCells(c);
    setMeta(m);
    setManuallyEdited(false);
    setPendingDoor(null);
    setPendingNpc(null);
    setHighlight(null);
    setCurrentId(sl.id);
    setStatus((sl.status as LevelStatus) ?? "draft");
  };

  const deleteFromLibrary = async (id: string) => {
    if (!confirm("Delete this saved level?")) return;
    try {
      await deleteBuilderLevel(id);
      if (currentId === id) setCurrentId(null);
      await refreshLibrary();
    } catch (err) {
      console.error(err);
      setFlash({ msg: "Delete failed.", tone: "warn" });
    }
  };

  const publishToGame = async () => {
    if (publishing) return;
    if (meta.levelNumber == null || Number.isNaN(meta.levelNumber) || meta.levelNumber <= 0) {
      setFlash({ msg: "Level number is required to publish.", tone: "warn" });
      return;
    }
    if (!confirm(`Publish Level ${meta.levelNumber} to the game? This overwrites any existing published version.`)) {
      return;
    }
    setPublishing(true);
    try {
      const data = exportLevel(cells, ulam, meta);
      await publishLevel(data);
      setFlash({ msg: `Published Level ${meta.levelNumber} to the game.`, tone: "info" });
    } catch (err) {
      console.error(err);
      setFlash({ msg: "Publish failed.", tone: "warn" });
    } finally {
      setPublishing(false);
    }
  };

  const exportJson = () => {
    const data = exportLevel(cells, ulam, meta);
    const safeName = meta.levelName.replace(/[^a-z0-9_-]+/gi, "_") || "level";
    downloadJson(`${safeName}.json`, data);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportedLevel;
        const { cells: c, meta: m, size: s } = importLevel(data);
        setSize(s);
        setCells(c);
        setMeta(m);
        setManuallyEdited(false);
        setHighlight(null);
        setCurrentId(null);
        setStatus("draft");
        setFlash({ msg: `Imported "${m.levelName}".`, tone: "info" });
      } catch (err) {
        console.error(err);
        setFlash({ msg: "Invalid JSON file.", tone: "warn" });
      }
    };
    reader.readAsText(file);
  };

  // Derived: list of door-to-room cells for the metadata panel
  const roomLinks = useMemo(() => {
    const out: { col: number; row: number; roomId: string }[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = cells[r * size + c];
        if (cell.type === "DOOR_TO_ROOM" && cell.door) {
          out.push({ col: c, row: r, roomId: cell.door.roomId });
        }
      }
    }
    return out;
  }, [cells, size]);

  // Save pending door confirm
  const confirmDoorRoomId = () => {
    if (!pendingDoor) return;
    if (!pendingDoor.roomId.trim()) {
      setFlash({ msg: "Room ID required.", tone: "warn" });
      return;
    }
    // Place placeholder door (without reentry yet) and switch to awaitingReentry
    setPendingDoor({ ...pendingDoor, awaitingReentry: true });
    setFlash({ msg: "Now click a cell to set the re-entry point.", tone: "info" });
  };

  const cancelPendingDoor = () => setPendingDoor(null);

  const confirmNpc = () => {
    if (!pendingNpc) return;
    if (!pendingNpc.name.trim()) {
      setFlash({ msg: "NPC name required.", tone: "warn" });
      return;
    }
    setCells((prev) => {
      const next = prev.slice();
      next[pendingNpc.row * size + pendingNpc.col] = {
        type: "NPC",
        npc: { name: pendingNpc.name.trim() },
      };
      return next;
    });
    setManuallyEdited(true);
    setPendingNpc(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Left sidebar: Library */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card/30">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-sm uppercase tracking-[0.25em] text-[color:var(--accent-gold)]">
            PRÆM
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Instrument Builder</p>
        </div>
        <div className="p-3">
          <button
            onClick={newLevel}
            className="w-full rounded-md border border-[color:var(--accent-gold)]/40 bg-[color:var(--accent-gold)]/10 px-3 py-2 text-xs font-medium uppercase tracking-wider text-[color:var(--accent-gold)] transition hover:bg-[color:var(--accent-gold)]/20"
          >
            + New Level
          </button>
        </div>
        <div className="px-3 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          Library
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {library.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">No saved levels.</div>
          )}
          {library.map((sl) => (
            <div
              key={sl.id}
              className={`group mb-1 flex items-center justify-between rounded-md border px-2 py-2 hover:bg-card/60 ${
                currentId === sl.id
                  ? "border-[color:var(--accent-gold)]/60 bg-[color:var(--accent-gold)]/5"
                  : "border-transparent hover:border-border"
              }`}
            >
              <button
                className="flex-1 text-left"
                onClick={() => loadFromLibrary(sl)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm text-foreground">{sl.data.levelName}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                      sl.status === "ready"
                        ? "bg-[color:var(--accent-gold)]/20 text-[color:var(--accent-gold)]"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {sl.status ?? "draft"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  L{sl.data.levelNumber} · {sl.data.gridSize}×{sl.data.gridSize} ·{" "}
                  {(sl.data.mode ?? "maze").replace("_", " ")}
                </div>
              </button>
              <button
                onClick={() => deleteFromLibrary(sl.id)}
                className="ml-2 opacity-0 transition group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Center: grid */}
      <main className="relative flex-1 overflow-hidden">
        <GridCanvas
          ref={gridRef}
          ulam={ulam}
          cells={cells}
          showNumbers={showNumbers}
          highlight={highlight}
          onCellClick={onCellClick}
          onCellHover={(c, r) => setHoverCell(r === null ? null : { col: c, row: r })}
          rotation={rotation}
          readOnly={rotation !== 0}
          routeA={routeA}
          routeB={routeB}
          routePath={routeResult?.set ?? null}
          mode={mode}
          rectPreview={
            paintMode === "rect" && rectStart && hoverCell
              ? { a: rectStart, b: hoverCell }
              : null
          }
        />
        {/* Dimension preview toggle (maze mode only) */}
        {mode === "maze" && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 flex items-center gap-1 rounded-full border border-border bg-card/80 p-1 text-[10px] uppercase tracking-widest backdrop-blur">
          {([
            { v: 0, label: "Purple", color: "#b87bff" },
            { v: 1, label: "Amber", color: "#f4c542" },
            { v: 3, label: "Teal", color: "#14b8a6" },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setRotation(opt.v)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${
                rotation === opt.v ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
        )}
        {rotation !== 0 && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-border bg-card/80 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
            Preview — edit in Purple
          </div>
        )}

        {flash && (
          <div
            className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-md border px-4 py-2 text-xs backdrop-blur ${
              flash.tone === "warn"
                ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
                : "border-[color:var(--accent-gold)]/40 bg-card/80 text-foreground"
            }`}
          >
            {flash.msg}
          </div>
        )}

        {/* Pending door inline form */}
        {pendingDoor && (
          <div className="absolute left-1/2 top-1/4 -translate-x-1/2 rounded-lg border border-border bg-card p-4 text-sm shadow-xl">
            <div className="mb-2 font-medium">
              Door to Room @ ({pendingDoor.col},{pendingDoor.row})
            </div>
            {!pendingDoor.awaitingReentry ? (
              <>
                <label className="mb-1 block text-xs text-muted-foreground">Room ID</label>
                <input
                  autoFocus
                  value={pendingDoor.roomId}
                  onChange={(e) => setPendingDoor({ ...pendingDoor, roomId: e.target.value })}
                  placeholder="golden_89_room"
                  className="mb-3 w-64 rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={confirmDoorRoomId}
                    className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90"
                  >
                    Set Re-entry →
                  </button>
                  <button
                    onClick={cancelPendingDoor}
                    className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-card"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">
                Click any cell on the grid to set the re-entry point.
                <div className="mt-2">
                  <button
                    onClick={cancelPendingDoor}
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-card"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending NPC inline form */}
        {pendingNpc && (
          <div className="absolute left-1/2 top-1/4 -translate-x-1/2 rounded-lg border border-border bg-card p-4 text-sm shadow-xl">
            <div className="mb-2 font-medium">
              NPC @ ({pendingNpc.col},{pendingNpc.row})
            </div>
            <label className="mb-1 block text-xs text-muted-foreground">Character</label>
            <div className="mb-3 w-64">
              <select
                autoFocus
                value={pendingNpc.name}
                onChange={(e) => setPendingNpc({ ...pendingNpc, name: e.target.value })}
                style={CHAR_SELECT_STYLE}
              >
                {PRAEM_CHARACTERS.map((n) => (
                  <option key={n} value={n} style={{ background: "#0d0d1a" }}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmNpc}
                className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90"
              >
                Save
              </button>
              <button
                onClick={() => setPendingNpc(null)}
                className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-card"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Right sidebar */}
      <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-card/30">
        <Section title="Mode">
          <div className="flex gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => changeMode(m.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] uppercase tracking-wider transition ${
                  mode === m.key
                    ? "border-[color:var(--accent-gold)] bg-[color:var(--accent-gold)]/10 text-[color:var(--accent-gold)]"
                    : "border-border text-muted-foreground hover:bg-card/60"
                }`}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {mode === "maze"
              ? "Ulam spiral maze with primes, fragments and doors."
              : mode === "village"
                ? "Open village layout: buildings, forest, paths and transfer points."
                : "Shadow Realm: ghost zones, eyes and transfer points."}
          </p>
        </Section>

        <Section title="Grid">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Size</span>
            <input
              type="number"
              min={20}
              max={200}
              value={size}
              onChange={(e) => {
                const v = Math.max(20, Math.min(200, parseInt(e.target.value || "20", 10)));
                resizeGrid(v);
              }}
              className="w-20 rounded border border-border bg-background px-2 py-1"
            />
            <span className="text-muted-foreground">× {size}</span>
          </div>
          {mode === "maze" && (
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={(e) => setShowNumbers(e.target.checked)}
            />
            <span>Show all cell numbers</span>
          </label>
          )}
        </Section>

        <Section title="Cell Tools">
          <div className="mb-2 flex gap-1.5">
            {(["cell", "rect"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setPaintMode(m);
                  setRectStart(null);
                }}
                className={`flex-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider transition ${
                  paintMode === m
                    ? "border-[color:var(--accent-gold)] bg-[color:var(--accent-gold)]/15 text-[color:var(--accent-gold)]"
                    : "border-border text-muted-foreground hover:bg-card/60"
                }`}
              >
                {m === "cell" ? "Cell" : "Fill Rect"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {tools.map((t) => (
              <button
                key={t.type}
                onClick={() => setTool(t.type)}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition ${
                  tool === t.type
                    ? "border-[color:var(--accent-gold)] bg-[color:var(--accent-gold)]/10"
                    : "border-border hover:bg-card/60"
                }`}
              >
                <span
                  className="inline-block h-3 w-3 rounded-sm border border-white/20"
                  style={{ background: t.swatch }}
                />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          {mode !== "maze" && PROP_TYPES.includes(tool) && (
            <div className="mt-3 rounded-md border border-border bg-background/50 p-2">
              <div className="mb-2 text-[10px] uppercase tracking-widest text-[color:var(--accent-gold)]">
                {CELL_LABELS[tool] ?? tool} properties
              </div>
              {tool === "NPC" && (
                <label className="mb-2 block">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                    Character
                  </span>
                  <select
                    value={propName}
                    onChange={(e) => setPropName(e.target.value)}
                    style={CHAR_SELECT_STYLE}
                  >
                    {PRAEM_CHARACTERS.map((n) => (
                      <option key={n} value={n} style={{ background: "#0d0d1a" }}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {tool === "LANDMARK" && (
                <label className="mb-2 block">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                    Name
                  </span>
                  <input
                    type="text"
                    value={propName}
                    onChange={(e) => setPropName(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  />
                </label>
              )}
            </div>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            {paintMode === "rect"
              ? rectStart
                ? "Click the opposite corner to fill the rectangle."
                : "Click the first corner of the rectangle."
              : "Left-click to paint. Right-click to clear. Shift+drag or middle-click to pan. Scroll to zoom."}
          </p>
        </Section>

        <Section title="Route">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRouteMode((v) => !v)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition ${
                routeMode
                  ? "border-[color:var(--accent-gold)] bg-[color:var(--accent-gold)]/10 text-[color:var(--accent-gold)]"
                  : "border-border hover:bg-card/60"
              }`}
            >
              {routeMode ? "Route: ON" : "Route Tool"}
            </button>
            <button
              onClick={clearRoute}
              className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-card/60"
            >
              Clear
            </button>
          </div>
          <div className="mt-2 text-xs">
            {!routeA && !routeB && (
              <span className="text-muted-foreground">
                {routeMode ? "Click a cell to set point A." : "Enable to measure path length."}
              </span>
            )}
            {routeA && !routeB && (
              <span className="text-muted-foreground">
                A set at ({routeA.col},{routeA.row}). Click point B.
              </span>
            )}
            {routeA && routeB && routeResult && (
              <span>
                {routeResult.steps >= 0 ? (
                  <>
                    <span className="text-foreground">Steps: </span>
                    <span className="font-mono text-[color:var(--accent-gold)]">{routeResult.steps}</span>
                  </>
                ) : (
                  <span className="text-destructive">No path</span>
                )}
              </span>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            BFS over walkable cells. Walls and veils block. 4-directional.
          </p>
        </Section>

        {mode === "maze" && (
        <><Section title="Complexity">
          <div className="mb-2 flex gap-1.5">
            {(["simple", "medium", "complex"] as const).map((k) => (
              <button
                key={k}
                onClick={() => applyPreset(k)}
                className="flex-1 rounded-md border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-card/60"
              >
                {k}
              </button>
            ))}
          </div>
          <Slider label="Dead-ends" value={deadEnds} onChange={setDeadEnds} />
          <Slider label="Branching" value={branching} onChange={setBranching} />
          <button
            onClick={runGenerate}
            className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium uppercase tracking-wider text-primary-foreground hover:opacity-90"
          >
            Generate Layout
          </button>
        </Section>

        <Section title="Fragments">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Count</span>
            <input
              type="number"
              min={0}
              max={ulam.primes.length}
              value={numFragments}
              onChange={(e) => setNumFragments(Math.max(0, parseInt(e.target.value || "0", 10)))}
              className="w-20 rounded border border-border bg-background px-2 py-1"
            />
            <span className="text-muted-foreground">/ {ulam.primes.length} primes</span>
          </div>
          <button
            onClick={suggestFragments}
            className="mt-2 w-full rounded-md border border-[color:var(--accent-gold)]/40 bg-[color:var(--accent-gold)]/10 px-3 py-1.5 text-xs text-[color:var(--accent-gold)] hover:bg-[color:var(--accent-gold)]/20"
          >
            Suggest Fragments
          </button>
        </Section>

        <Section title="Prime Reference">
          <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background/50">
            {ulam.primes.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">None.</div>
            )}
            {ulam.primes.map((p) => (
              <button
                key={p.n}
                onClick={() => {
                  setHighlight({ col: p.col, row: p.row });
                  gridRef.current?.centerOn(p.col, p.row);
                }}
                className="flex w-full items-center justify-between px-2 py-1 text-left text-xs hover:bg-card/60"
              >
                <span className="font-mono text-[color:var(--accent-gold)]">{p.n}</span>
                <span className="text-muted-foreground">
                  ({p.col},{p.row})
                </span>
              </button>
            ))}
          </div>
        </Section></>
        )}

        {mode === "village" && (
          <Section title="Village Population">
            <label className="text-xs text-muted-foreground">Density</label>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={vDensity}
              onChange={(e) => setVDensity(parseInt(e.target.value, 10))}
              className="w-full accent-[color:var(--accent-gold)]"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Open</span>
              <span>{vDensity}</span>
              <span>Dense</span>
            </div>

            <label className="mt-2 block text-xs text-muted-foreground">Building mix</label>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={vMix}
              onChange={(e) => setVMix(parseInt(e.target.value, 10))}
              className="w-full accent-[color:var(--accent-gold)]"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Small</span>
              <span>{vMix}</span>
              <span>Large</span>
            </div>

            <label className="mt-2 block text-xs text-muted-foreground">Chaos</label>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={vChaos}
              onChange={(e) => setVChaos(parseInt(e.target.value, 10))}
              className="w-full accent-[color:var(--accent-gold)]"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Symmetric</span>
              <span>{vChaos}</span>
              <span>Chaotic</span>
            </div>

            <label className="mt-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={vBorder}
                onChange={(e) => setVBorder(e.target.checked)}
              />
              <span>Border wall</span>
            </label>

            <div className="mt-3 flex items-stretch gap-2">
              <button
                onClick={() => runPopulate()}
                className="flex-1 rounded-md py-2 font-display text-xs uppercase tracking-[0.2em] transition hover:brightness-125"
                style={{
                  border: "1px solid #c8963a",
                  color: "#c8963a",
                  background: "rgba(200,150,58,0.08)",
                }}
              >
                Populate
              </button>
              <button
                onClick={randomisePopulate}
                title="Randomise & populate"
                className="rounded-md px-3 text-sm transition hover:brightness-125"
                style={{
                  border: "1px solid #c8963a",
                  color: "#c8963a",
                  background: "rgba(200,150,58,0.08)",
                }}
              >
                ↺
              </button>
              <button
                onClick={clearVillage}
                className="rounded-md px-3 text-[10px] uppercase tracking-wider transition hover:bg-card"
                style={{
                  border: "0.5px solid rgba(100,80,160,0.3)",
                  color: "rgba(160,140,200,0.5)",
                  background: "transparent",
                }}
              >
                Clear
              </button>
            </div>
            <p className="mt-2" style={{ color: "rgba(160,140,200,0.4)", fontSize: 11 }}>
              Manual placements (NPCs, whispers, special buildings) are preserved.
            </p>
          </Section>
        )}

        {mode === "shadow_realm" && (
          <Section title="Shadow Population">
            <label className="text-xs text-muted-foreground">Density</label>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={sDensity}
              onChange={(e) => setSDensity(parseInt(e.target.value, 10))}
              className="w-full accent-[color:var(--accent-gold)]"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Sparse</span>
              <span>{sDensity}</span>
              <span>Dense</span>
            </div>

            <label className="mt-2 block text-xs text-muted-foreground">Atmosphere</label>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={sAtmosphere}
              onChange={(e) => setSAtmosphere(parseInt(e.target.value, 10))}
              className="w-full accent-[color:var(--accent-gold)]"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Open</span>
              <span>{sAtmosphere}</span>
              <span>Oppressive</span>
            </div>

            <label className="mt-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={sBorder}
                onChange={(e) => setSBorder(e.target.checked)}
              />
              <span>Border</span>
            </label>

            <div className="mt-3 flex items-stretch gap-2">
              <button
                onClick={() => runShadowPopulate()}
                className="flex-1 rounded-md py-2 font-display text-xs uppercase tracking-[0.2em] transition hover:brightness-125"
                style={{
                  border: "1px solid #c8963a",
                  color: "#c8963a",
                  background: "rgba(200,150,58,0.08)",
                }}
              >
                Populate
              </button>
              <button
                onClick={randomiseShadow}
                title="Randomise & populate"
                className="rounded-md px-3 text-sm transition hover:brightness-125"
                style={{
                  border: "1px solid #c8963a",
                  color: "#c8963a",
                  background: "rgba(200,150,58,0.08)",
                }}
              >
                ↺
              </button>
              <button
                onClick={clearShadow}
                className="rounded-md px-3 text-[10px] uppercase tracking-wider transition hover:bg-card"
                style={{
                  border: "0.5px solid rgba(100,80,160,0.3)",
                  color: "rgba(160,140,200,0.5)",
                  background: "transparent",
                }}
              >
                Clear
              </button>
            </div>
            <p className="mt-2" style={{ color: "rgba(200,100,100,0.4)", fontSize: 11 }}>
              Manually placed NPCs and transfer point are preserved.
            </p>
          </Section>
        )}

        <Section title="Level Metadata">
          <Field label="Level #">
            <input
              type="number"
              value={meta.levelNumber}
              onChange={(e) =>
                setMeta({ ...meta, levelNumber: parseInt(e.target.value || "0", 10) })
              }
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </Field>
          <Field label="Name">
            <input
              type="text"
              value={meta.levelName}
              onChange={(e) => setMeta({ ...meta, levelName: e.target.value })}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </Field>
          <Field label="Required Fragments">
            <input
              type="number"
              value={meta.requiredFragments}
              onChange={(e) =>
                setMeta({ ...meta, requiredFragments: parseInt(e.target.value || "0", 10) })
              }
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={meta.notes}
              onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
              rows={3}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </Field>
          <Field label="Status">
            <div className="flex gap-1.5">
              {(["draft", "ready"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider transition ${
                    status === s
                      ? s === "ready"
                        ? "border-[color:var(--accent-gold)] bg-[color:var(--accent-gold)]/15 text-[color:var(--accent-gold)]"
                        : "border-border bg-card text-foreground"
                      : "border-border text-muted-foreground hover:bg-card/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <button
            onClick={publishToGame}
            disabled={publishing}
            className="mt-2 w-full rounded-md bg-[color:var(--accent-gold)] px-3 py-2 text-xs font-medium uppercase tracking-wider text-background hover:opacity-90 disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish to Game"}
          </button>
          <div className="mt-2">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Room Links ({roomLinks.length})
            </div>
            {roomLinks.length === 0 ? (
              <div className="text-xs text-muted-foreground">No doors placed.</div>
            ) : (
              <div className="max-h-28 overflow-y-auto rounded-md border border-border bg-background/50">
                {roomLinks.map((rl, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2 py-1 text-xs"
                  >
                    <span className="truncate text-foreground">{rl.roomId || "(unnamed)"}</span>
                    <span className="ml-2 text-muted-foreground">
                      ({rl.col},{rl.row})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Save / Export">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={saveToLibrary}
              disabled={saving}
              className="rounded-md bg-primary px-2 py-1.5 text-xs text-primary-foreground hover:opacity-90"
            >
              {saving ? "Saving…" : currentId ? "Update" : "Save"}
            </button>
            <button
              onClick={exportJson}
              className="rounded-md border border-[color:var(--accent-gold)]/40 bg-[color:var(--accent-gold)]/10 px-2 py-1.5 text-xs text-[color:var(--accent-gold)] hover:bg-[color:var(--accent-gold)]/20"
            >
              Export JSON
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="col-span-2 rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-card/60"
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
          </div>
        </Section>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border p-4">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--accent-gold)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-[color:var(--accent-gold)]"
      />
    </div>
  );
}