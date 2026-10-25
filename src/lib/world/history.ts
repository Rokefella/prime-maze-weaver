import type { Terrain, DayNight } from './terrain';
import type { Area, Era, Id, Place, WorldLink } from './model';
// Session undo history for WORLD writes: each step carries before/after so undo
// and redo can replay the write without touching unrelated rows.
export type WorldWrite =
 | { type:'update-terrain'; key:string; before:Terrain; after:Terrain }
 | { type:'insert-terrain'; key:string; row:Terrain }
 | { type:'update-day-night'; before:DayNight; after:DayNight }
 | { type: 'update-place'; id: Id; before: Place; after: Place }
 | { type: 'insert-place'; id: Id; row: Place }
 | { type: 'delete-place'; id: Id; row: Place; links: WorldLink[] }
 | { type: 'update-era'; id: Id; before: Era; after: Era }
 | { type: 'update-area'; before: Area; after: Area }
 | { type: 'insert-link'; id: Id; row: WorldLink }
 | { type: 'delete-link'; id: Id; row: WorldLink };
export const HISTORY_CAP = 100;
export function pushStep(stack: WorldWrite[], step: WorldWrite, cap = HISTORY_CAP): WorldWrite[] {
 const next = [...stack, step];
 return next.length > cap ? next.slice(next.length - cap) : next;
}
const placeName = (p: Place) => p.name || p.kind;
export function writeLabel(w: WorldWrite): string {
 switch (w.type) {
  case 'update-terrain': return `terrain ${w.after.name}`;
  case 'insert-terrain': return `create terrain ${w.row.name}`;
  case 'update-day-night': return 'day and night';
  case 'update-place': return `${w.before.x !== w.after.x || w.before.y !== w.after.y ? 'move' : 'edit'} ${placeName(w.after)}`;
  case 'insert-place': return `create ${placeName(w.row)}`;
  case 'delete-place': return `delete ${placeName(w.row)}`;
  case 'update-era': return `era ${w.after.name}`;
  case 'update-area': return `${!w.before.draft_name && w.after.draft_name ? 'create draft ' : ''}area ${w.after.ax},${w.after.ay}`;
  case 'insert-link': return 'add link';
  case 'delete-link': return 'delete link';
 }
}
