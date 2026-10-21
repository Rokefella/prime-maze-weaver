import cobble from "@/assets/path-cobble.svg";
import plates from "@/assets/path-plates.svg";
import brick from "@/assets/path-brick.svg";
import type { CellType, StreetStyle } from "./types";

export const STREET_STYLES: { key: StreetStyle; label: string; image: string }[] = [
  { key: "cobble", label: "COBBLE", image: cobble },
  { key: "plates", label: "PLATES", image: plates },
  { key: "brick", label: "BRICK AND LAMPS", image: brick },
];

export function isVillageStreet(type: CellType) {
  return type === "ROAD" || type === "SQUARE" || type === "PATH";
}