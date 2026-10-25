import type { CellState, CellType } from '../maze/types';
export const TERRAIN_GROUPS = ['ground','water','edge','plant','rock','structure','hazard','atmosphere'] as const;
export const BUILD_SETS = ['1','2','3','later'] as const;
export const MOVES = ['none','sway','drift','heat_shimmer','shimmer','flow','flow_slow','flow_fast','flow_light','foam','fall','glow','glow_night','steam','bubble','jets','waves','ooze','ripple','pulse','flicker','turn','sweep','trains','smoke','fog','grow','glint','blow','move'] as const;
export const SIGHTS = ['open','blocks','dims','hides','dark','glints'] as const;
export interface Terrain { key:string; name:string; grp:typeof TERRAIN_GROUPS[number]; sort:number; build_set:typeof BUILD_SETS[number]; walkable:boolean; steps:number|null; walk_note:string|null; sight:typeof SIGHTS[number]; sight_delta:number; light_radius:number; eras:string[]; where_note:string|null; moves:string; color:string|null; icon_svg:string|null; exists_as:string|null; notes:string|null; enabled:boolean; updated_at?:string }
export interface DayNight { cycle_minutes:number; day:number; dusk:number; night:number; dawn:number; night_view_delta:number; applies_to:string[]; moon_cycle_days:number; full_moon_rare_bonus:number; [key:string]:unknown }
export function terrainCell(t:Terrain):CellState {
 const equivalents:CellType[]=['TREE','FOREST','FLOWER','PATH','ROAD','SQUARE','LANDMARK','GROUND','LIGHT'];
 const named=(t.exists_as??'').split(',').map(v=>v.trim().toUpperCase());
 if(named.some(v=>v==='BUILDING'||v.startsWith('BUILDING_')))return {type:'BUILDING_S'};
 const type=equivalents.find(v=>named.includes(v));
 return type?{type}:{type:'TERRAIN',terrain:t.key};
}
export function filterTerrain(rows:Terrain[],f:{group?:string;set?:string;era?:string;walkable?:string;search?:string;enabledOnly?:boolean}) {
 const q=f.search?.trim().toLowerCase();
 return rows.filter(t=>(!f.enabledOnly||t.enabled)&&(!f.group||t.grp===f.group)&&(!f.set||t.build_set===f.set)&&(!f.era||t.eras?.includes(f.era))&&(!f.walkable||t.walkable===(f.walkable==='yes'))&&(!q||[t.key,t.name,t.notes,t.exists_as,t.where_note].some(v=>v?.toLowerCase().includes(q)))).sort((a,b)=>TERRAIN_GROUPS.indexOf(a.grp)-TERRAIN_GROUPS.indexOf(b.grp)||a.sort-b.sort||a.name.localeCompare(b.name));
}
export const snakeKey=(s:string)=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
export const phaseTotal=(d:DayNight)=>d.day+d.dusk+d.night+d.dawn;
export function cyclePhase(d:DayNight,unixMs:number) {
 const cycle=Math.max(.01,d.cycle_minutes),position=((unixMs/60000)%cycle+cycle)%cycle;
 let end=0;for(const phase of ['day','dusk','night','dawn'] as const){end+=d[phase];if(position<end)return {phase,position,fraction:position/cycle};}
 return {phase:'gap',position,fraction:position/cycle};
}
