import type { CellState, ExportedLevel, LevelMeta, SavedLevel } from "./types";
import type { UlamData } from "./ulam";

export const LIBRARY_KEY = "praem_levels_v1";

export function exportLevel(
  cells: CellState[],
  ulam: UlamData,
  meta: LevelMeta,
): ExportedLevel {
  const size = ulam.size;
  const walls: { col: number; row: number }[] = [];
  const corridors: { col: number; row: number }[] = [];
  const fragments: { col: number; row: number; prime: number }[] = [];
  const doorsToRoom: ExportedLevel["doorsToRoom"] = [];
  const npcs: ExportedLevel["npcs"] = [];
  let start: ExportedLevel["start"] = null;
  let goldenDoor: ExportedLevel["goldenDoor"] = null;
  let blueDoor: ExportedLevel["blueDoor"] = null;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const i = r * size + c;
      const cell = cells[i];
      switch (cell.type) {
        case "WALL":
          walls.push({ col: c, row: r });
          break;
        case "CORRIDOR":
          corridors.push({ col: c, row: r });
          break;
        case "FRAGMENT":
          corridors.push({ col: c, row: r });
          fragments.push({ col: c, row: r, prime: ulam.numbers[i] });
          break;
        case "START":
          corridors.push({ col: c, row: r });
          start = { col: c, row: r };
          break;
        case "GOLDEN_DOOR":
          corridors.push({ col: c, row: r });
          goldenDoor = { col: c, row: r };
          break;
        case "BLUE_DOOR":
          corridors.push({ col: c, row: r });
          blueDoor = { col: c, row: r };
          break;
        case "DOOR_TO_ROOM":
          corridors.push({ col: c, row: r });
          if (cell.door) {
            doorsToRoom.push({
              col: c,
              row: r,
              roomId: cell.door.roomId,
              reentry: cell.door.reentry,
            });
          }
          break;
        case "NPC":
          corridors.push({ col: c, row: r });
          if (cell.npc) {
            npcs.push({ col: c, row: r, name: cell.npc.name });
          }
          break;
      }
    }
  }

  const storageMode: "walls" | "corridors" =
    walls.length <= corridors.length ? "walls" : "corridors";

  return {
    schemaVersion: 1,
    levelNumber: meta.levelNumber,
    levelName: meta.levelName,
    gridSize: size,
    requiredFragments: meta.requiredFragments,
    notes: meta.notes,
    start,
    storageMode,
    walls: storageMode === "walls" ? walls : [],
    corridors: storageMode === "corridors" ? corridors : [],
    fragments,
    goldenDoor,
    blueDoor,
    doorsToRoom,
    npcs,
  };
}

export function importLevel(data: ExportedLevel): {
  cells: CellState[];
  meta: LevelMeta;
  size: number;
} {
  const size = data.gridSize;
  const total = size * size;
  const cells: CellState[] = new Array(total);
  const defaultType = data.storageMode === "walls" ? "CORRIDOR" : "WALL";
  for (let i = 0; i < total; i++) cells[i] = { type: defaultType };
  const setCell = (c: number, r: number, state: CellState) => {
    if (c < 0 || c >= size || r < 0 || r >= size) return;
    cells[r * size + c] = state;
  };
  if (data.storageMode === "walls") {
    for (const w of data.walls) setCell(w.col, w.row, { type: "WALL" });
  } else {
    for (const ch of data.corridors)
      setCell(ch.col, ch.row, { type: "CORRIDOR" });
  }
  for (const f of data.fragments) setCell(f.col, f.row, { type: "FRAGMENT" });
  for (const d of data.doorsToRoom)
    setCell(d.col, d.row, {
      type: "DOOR_TO_ROOM",
      door: { roomId: d.roomId, reentry: d.reentry },
    });
  for (const n of data.npcs)
    setCell(n.col, n.row, { type: "NPC", npc: { name: n.name } });
  if (data.blueDoor) setCell(data.blueDoor.col, data.blueDoor.row, { type: "BLUE_DOOR" });
  if (data.goldenDoor)
    setCell(data.goldenDoor.col, data.goldenDoor.row, { type: "GOLDEN_DOOR" });
  if (data.start) setCell(data.start.col, data.start.row, { type: "START" });

  return {
    cells,
    size,
    meta: {
      levelNumber: data.levelNumber,
      levelName: data.levelName,
      requiredFragments: data.requiredFragments,
      notes: data.notes,
    },
  };
}

export function loadLibrary(): SavedLevel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedLevel[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveLibrary(levels: SavedLevel[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(levels));
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}