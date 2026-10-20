import type { BuilderMode, CellState } from "./types";

export function placeConsoleDoor(cells: CellState[], index: number): CellState[] {
  return cells.map((cell, i) => i === index ? { type: "CONSOLE_DOOR" }
    : cell.type === "CONSOLE_DOOR" ? { type: "CORRIDOR" } : cell);
}

export function consoleDoorWarning(mode: BuilderMode, cells: CellState[]): string {
  return mode === "maze" && !cells.some((cell) => cell.type === "CONSOLE_DOOR") ? "No console door placed" : "";
}