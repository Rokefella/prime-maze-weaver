import type { CellState } from "./types";

/** Match the blue room's explicit ID, not unrelated coloured room doors. */
export function isBlueRoom(roomId: string): boolean {
  return /^(blue|blue[ _-]room)$/i.test(roomId.trim());
}

/** Author-time removal only; never mutates a loaded or saved level. */
export function removeBlueDoor(cells: CellState[]): CellState[] {
  return cells.map((cell) =>
    cell.type === "BLUE_DOOR" ||
    (cell.type === "DOOR_TO_ROOM" && cell.door && isBlueRoom(cell.door.roomId))
      ? { type: "CORRIDOR" }
      : cell,
  );
}

export function placeBlueDoor(cells: CellState[], index: number): CellState[] {
  return cells.map((cell, i) => i === index
    ? { type: "BLUE_DOOR" }
    : cell.type === "BLUE_DOOR" ? { type: "CORRIDOR" } : cell);
}