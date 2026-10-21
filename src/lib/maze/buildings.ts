import type { BuildingAge, BuildingTone, CellState, CellType, LevelMeta } from "./types";
import { BUILDING_TYPES } from "./palette";

export const BUILDING_TONES: { name: BuildingTone; color: string }[] = [
  { name: "terracotta", color: "#c8603a" },
  { name: "sand", color: "#d4b078" },
  { name: "slate", color: "#6a86a8" },
  { name: "sage", color: "#7a9a6a" },
  { name: "plum", color: "#8a5a8a" },
  { name: "stone", color: "#8a8a96" },
];
export const BUILDING_AGES: BuildingAge[] = [1, 2, 3, 4];
export function isBuilding(type: CellType) { return BUILDING_TYPES.some((building) => building === type); }
export function isPaintableBuilding(type: CellType) { return type === "BUILDING_S" || type === "BUILDING_M" || type === "BUILDING_L"; }

export function buildingColors(tone: BuildingTone = "sand", age: BuildingAge = 4) {
  const base = BUILDING_TONES.find((entry) => entry.name === tone)?.color ?? BUILDING_TONES[1].color;
  const index = BUILDING_AGES.includes(age) ? age - 1 : 3;
  const multiplier = [0.45, 0.62, 0.80, 1][index];
  const mix = [0.12, 0.08, 0.04, 0][index];
  const channels = [1, 3, 5].map((offset) => parseInt(base.slice(offset, offset + 2), 16) * multiplier);
  const grey = channels.reduce((sum, value) => sum + value, 0) / 3;
  const wall = channels.map((value) => value * (1 - mix) + grey * mix);
  const hex = (rgb: number[]) => `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
  return { wall: hex(wall), roof: hex(wall.map((value) => value * 0.65)) };
}

export function ageBuildings(cells: CellState[]) {
  let changed = 0;
  const next = cells.map((cell) => {
    if (!isBuilding(cell.type) || (cell.age ?? 4) <= 1) return cell;
    changed++;
    return { ...cell, tone: cell.tone ?? "sand", age: Math.max(1, (cell.age ?? 4) - 1) as BuildingAge };
  });
  return { cells: next, changed };
}

export function nextVillage(cells: CellState[], meta: LevelMeta) {
  const aged = ageBuildings(cells);
  const levelNumber = meta.levelNumber + 1;
  return { ...aged, meta: { ...meta, levelNumber, levelName: `Village${levelNumber}` } };
}