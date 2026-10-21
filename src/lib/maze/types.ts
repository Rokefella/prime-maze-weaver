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
  | "BOOKCASE"
  | "ROOM_EXIT"
  | "BERNARD"
  | "MERCHANT"
  | "BANKER"
  | "LIGHT"
  | "RUG"
  | "FLOWER"
  | "TREE"
  | "GARDEN_DECOR"
  | "GROUND"
  | "GARDEN_DOOR"
  | "DOOR_MAZE"
  | "DOOR_LIBRARY"
  | "DOOR_EXCHANGE"
  | "ROOM_DOOR"
  | "CONSOLE_DOOR"
  | "DROP_SPAWN"
  | "SPAWN"
  | "GHOST";

export type BuilderMode =
  | "maze"
  | "village"
  | "shadow_realm"
  | "library"
  | "exchange"
  | "bernard_room";

export interface DoorToRoomData {
  roomId: string;
  reentry: { col: number; row: number };
}

export interface NpcData {
  name: string;
  /** Key of a row in the npcs table (generic NPC placement). */
  npcKey?: string;
}

export interface WhisperData {
  text: string;
}

/** A door inside a room leading back out to a world. */
export interface RoomExitData {
  destination: "village" | "maze" | "shadow_realm";
}

/** A colored door inside a maze leading to a room. */
export interface RoomDoorData {
  /** Color key (e.g. "blue") or any css/hex value. Extensible, not an enum. */
  color: string;
}

/** A loot spawn point inside a maze. */
export interface DropSpawnData {
  /** Row id in the drop_types table (when selected from the live list). */
  dropTypeId?: string;
  dropKey: string;
  /** Spawn chance percent, 0-100. */
  chance: number;
}

export type BuildingTone = "terracotta" | "sand" | "slate" | "sage" | "plum" | "stone";
export type BuildingAge = 1 | 2 | 3 | 4;

export type GhostTone = "pale" | "mist" | "gold" | "rose";

export interface GhostData {
  title: string;
  line?: string;
  tone: GhostTone;
}

export interface CellState {
  type: CellType;
  door?: DoorToRoomData;
  npc?: NpcData;
  whisper?: WhisperData;
  exit?: RoomExitData;
  roomDoor?: RoomDoorData;
  /** Recolourable room decoration or light. */
  color?: string;
  dropSpawn?: DropSpawnData;
  tone?: BuildingTone;
  age?: BuildingAge;
  ghost?: GhostData;
}

export interface LevelMeta {
  levelNumber: number;
  levelName: string;
  requiredFragments: number;
  notes: string;
  mode: BuilderMode;
  /** Season label for room interiors (e.g. "spring", "christmas"). */
  season?: string;
  /** Maze only: drop_keys of key drops placed once per run. */
  keyDrops?: string[];
  /** Maze only: chance-rolled drops per run. */
  dropPool?: { drop_key: string; chance: number }[];
}

export interface ExportedLevel {
  schemaVersion: 1;
  mode: BuilderMode;
  levelNumber: number;
  levelName: string;
  gridSize: number;
  /** Top-level season label for room interiors (same level as gridSize). */
  season?: string;
  requiredFragments: number;
  notes: string;
  keyDrops?: string[];
  dropPool?: { drop_key: string; chance: number }[];
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
    npc_key?: string;
    whisper?: WhisperData;
    exit?: RoomExitData;
    roomDoor?: RoomDoorData;
    color?: string;
    dropSpawn?: DropSpawnData;
    drop_type_id?: string;
    drop_key?: string;
    chance?: number;
    tone?: BuildingTone;
    age?: BuildingAge;
    title?: string;
    line?: string;
    tone?: GhostTone | BuildingTone;
  }[];
}

export interface SavedLevel {
  id: string;
  savedAt: number;
  status?: "draft" | "ready";
  data: ExportedLevel;
}