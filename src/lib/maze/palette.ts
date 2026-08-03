// Visual palette for grid rendering. Reskinnable in one place.
export const PALETTE = {
  background: "#0e0a1f",
  gridLine: "rgba(255,255,255,0.04)",
  wall: "#1a1130",
  corridor: "#2a1d4d",
  primeCorridor: "#3a2a18", // muted gold tint for prime open cells
  primeNumber: "#d4af37",
  nonPrimeNumber: "rgba(255,255,255,0.5)",
  fragment: "#b87bff",
  start: "#3ddc97",
  goldenDoor: "#f4c542",
  blueDoor: "#3b82f6",
  doorToRoom: "#f59e0b",
  npc: "#14b8a6",
  veil: "#251a3d",
  veilMarker: "rgba(184,123,255,0.35)",
  drop: "#22c55e",
  highlight: "#ffffff",
  hoverOutline: "rgba(255,255,255,0.6)",
};

// Village mode palette
export const VILLAGE_PALETTE = {
  background: "#0d1410",
  open: "#1d2a20",
  path: "#4a3b28",
  forest: "#16351f",
  forestDot: "rgba(120,220,150,0.35)",
  buildingS: "#5a4630",
  buildingM: "#6b5236",
  buildingL: "#7d5f3d",
  buildingPrime: "#8a6a1f",
  buildingBorder: "rgba(255,225,170,0.55)",
  eye: "#c9d94a",
  transfer: "#38bdf8",
};

// New village city types
export const VILLAGE_EXTRA = {
  square: "rgba(100,80,160,0.06)",
  road: "rgba(100,80,160,0.08)",
  roadBorder: "rgba(100,80,160,0.15)",
  landmark: "rgba(100,80,160,0.08)",
  landmarkBorder: "rgba(160,140,200,0.3)",
  whisper: "rgba(91,79,212,0.06)",
  whisperBorder: "rgba(160,140,200,0.4)",
  whisperGlyph: "rgba(160,140,200,0.5)",
};

// Shadow Realm palette
export const SHADOW_PALETTE = {
  background: "#08070c",
  open: "#14121c",
  path: "#241f33",
  ghost: "#2b2340",
  ghostMarker: "rgba(180,150,255,0.28)",
  eye: "#ff4d6d",
  transfer: "#a78bfa",
  buildingBorder: "rgba(200,180,255,0.45)",
};

export const BUILDING_TYPES = [
  "BUILDING_S",
  "BUILDING_M",
  "BUILDING_L",
  "BUILDING_23",
  "BUILDING_47",
  "BUILDING_89",
] as const;

export const BUILDING_GLYPH: Record<string, string> = {
  BUILDING_S: "S",
  BUILDING_M: "M",
  BUILDING_L: "L",
  BUILDING_23: "23",
  BUILDING_47: "47",
  BUILDING_89: "89",
};

export const CELL_LABELS: Record<string, string> = {
  WALL: "Wall",
  CORRIDOR: "Corridor",
  FRAGMENT: "Fragment",
  GOLDEN_DOOR: "Golden Door",
  START: "Start",
  BLUE_DOOR: "Blue Door",
  DOOR_TO_ROOM: "Door to Room",
  NPC: "NPC",
  VEIL: "Veil",
  DROP: "Drop",
  OPEN: "Open Ground",
  PATH: "Path",
  FOREST: "Forest",
  BUILDING_S: "Building S",
  BUILDING_M: "Building M",
  BUILDING_L: "Building L",
  BUILDING_23: "Building 23",
  BUILDING_47: "Building 47",
  BUILDING_89: "Building 89",
  EYE: "Eye",
  TRANSFER_POINT: "Transfer Point",
  GHOST_ZONE: "Ghost Zone",
  SQUARE: "Square",
  ROAD: "Road",
  LANDMARK: "Landmark",
  WHISPER: "Whisper",
  FURNITURE: "Furniture",
  ROOM_EXIT: "Room Exit",
  BERNARD: "Bernard",
  MERCHANT: "Merchant",
};

export function swatchFor(type: string, mode: "maze" | "village" | "shadow_realm"): string {
  if (mode === "village") {
    switch (type) {
      case "OPEN": return VILLAGE_PALETTE.open;
      case "PATH": return VILLAGE_PALETTE.path;
      case "SQUARE": return "#232f27";
      case "ROAD": return "#3a3048";
      case "LANDMARK": return "#33294a";
      case "WHISPER": return "#2a2450";
      case "FOREST": return VILLAGE_PALETTE.forest;
      case "FURNITURE": return "#6b4a2e";
      case "ROOM_EXIT": return "#8a6a1f";
      case "BERNARD": return "#c98a1f";
      case "MERCHANT": return "#2f9e5f";
      case "WALL": return PALETTE.wall;
      case "BUILDING_S": return VILLAGE_PALETTE.buildingS;
      case "BUILDING_M": return VILLAGE_PALETTE.buildingM;
      case "BUILDING_L": return VILLAGE_PALETTE.buildingL;
      case "BUILDING_23":
      case "BUILDING_47":
      case "BUILDING_89": return VILLAGE_PALETTE.buildingPrime;
      case "EYE": return VILLAGE_PALETTE.eye;
      case "TRANSFER_POINT": return VILLAGE_PALETTE.transfer;
      case "NPC": return PALETTE.npc;
      case "DROP": return PALETTE.drop;
      default: return VILLAGE_PALETTE.open;
    }
  }
  if (mode === "shadow_realm") {
    switch (type) {
      case "OPEN": return SHADOW_PALETTE.open;
      case "PATH": return SHADOW_PALETTE.path;
      case "GHOST_ZONE": return SHADOW_PALETTE.ghost;
      case "EYE": return SHADOW_PALETTE.eye;
      case "TRANSFER_POINT": return SHADOW_PALETTE.transfer;
      case "NPC": return PALETTE.npc;
      case "DROP": return PALETTE.drop;
      case "WALL": return "#0f0d16";
      default: return SHADOW_PALETTE.open;
    }
  }
  return PALETTE.corridor;
}
/** Known PRÆM characters selectable for NPC cells. */
export const PRAEM_CHARACTERS = [
  "Bernard",
  "The Painter",
  "The Hacker",
  "The Priest",
  "The Mayor",
  "The Chef",
  "The Architect",
  "Alexandra",
] as const;

export const CHARACTER_ABBR: Record<string, string> = {
  Bernard: "BRN",
  "The Painter": "PNT",
  "The Hacker": "HCK",
  "The Priest": "PRS",
  "The Mayor": "MYR",
  "The Chef": "CHF",
  "The Architect": "ARC",
  Alexandra: "ALX",
};

export function abbrevCharacter(name?: string): string {
  if (!name) return "";
  return CHARACTER_ABBR[name] ?? name.slice(0, 3).toUpperCase();
}
