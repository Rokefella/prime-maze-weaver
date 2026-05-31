export type CellType =
  | "WALL"
  | "CORRIDOR"
  | "FRAGMENT"
  | "GOLDEN_DOOR"
  | "START"
  | "BLUE_DOOR"
  | "DOOR_TO_ROOM"
  | "NPC";

export interface DoorToRoomData {
  roomId: string;
  reentry: { col: number; row: number };
}

export interface NpcData {
  name: string;
}

export interface CellState {
  type: CellType;
  door?: DoorToRoomData;
  npc?: NpcData;
}

export interface LevelMeta {
  levelNumber: number;
  levelName: string;
  requiredFragments: number;
  notes: string;
}

export interface ExportedLevel {
  schemaVersion: 1;
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
}

export interface SavedLevel {
  id: string;
  savedAt: number;
  status?: "draft" | "ready";
  data: ExportedLevel;
}