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
};