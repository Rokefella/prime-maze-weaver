export type CellType =
  | "WALL"
  | "CORRIDOR"
  | "FRAGMENT"
  | "GOLDEN_DOOR"
  | "START"
  | "BLUE_DOOR"
  | "DOOR_TO_ROOM"
  | "NPC"
  | "VEIL"
  | "DROP"
  | "OPEN"
  | "BUILDING_S"
  | "BUILDING_M"
  | "BUILDING_L"
  | "BUILDING_23"
  | "BUILDING_47"
  | "BUILDING_89"
  | "FOREST"
  | "EYE"
  | "PATH"
  | "TRANSFER_POINT"
  | "GHOST_ZONE"
  | "SQUARE"
  | "ROAD"
  | "LANDMARK"
  | "WHISPER"
  | "FURNITURE"
  | "ROOM_EXIT";

export type BuilderMode = "maze" | "village" | "shadow_realm";

export interface DoorToRoomData {
  roomId: string;
  reentry: { col: number; row: number };
}

export interface NpcData {
  name: string;
}

export interface WhisperData {
  text: string;
}

/** A door inside a room leading back out to a world. */
export interface RoomExitData {
  destination: "village" | "maze" | "shadow_realm";
}

export interface CellState {
  type: CellType;
  door?: DoorToRoomData;
  npc?: NpcData;
  whisper?: WhisperData;
  exit?: RoomExitData;
}

export interface LevelMeta {
  levelNumber: number;
  levelName: string;
  requiredFragments: number;
  notes: string;
  mode: BuilderMode;
}

export interface ExportedLevel {
  schemaVersion: 1;
  mode: BuilderMode;
  levelNumber: number;
  levelName: string;
  gridSize: number;
  requiredFragments: number;
  notes: string;
  start: { col: number; row: number } | null;
  storageMode: "walls" | "corridors";
  walls: { col: number; row: number }[];
  corridors: { col: number; row: number }[];
  fragments: { col: number; row: number; prime: number }[];
  goldenDoor: { col: number; row: number } | null;
  blueDoor: { col: number; row: number } | null;
  doorsToRoom: {
    col: number;
    row: number;
    roomId: string;
    reentry: { col: number; row: number };
  }[];
  npcs: { col: number; row: number; name: string }[];
  veils: { col: number; row: number }[];
  drops: { col: number; row: number }[];
  whispers: { col: number; row: number; text: string }[];
  landmarks: { col: number; row: number; name: string }[];
  /** Cells belonging to non-maze modes (village / shadow realm). */
  extraCells?: {
    col: number;
    row: number;
    type: CellType;
    name?: string;
    npc_name?: string;
    whisper?: WhisperData;
    exit?: RoomExitData;
  }[];
}

export interface SavedLevel {
  id: string;
  savedAt: number;
  status?: "draft" | "ready";
  data: ExportedLevel;
}