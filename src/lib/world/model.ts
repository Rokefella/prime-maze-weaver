import type { Terrain, DayNight } from './terrain';
export type Id = string | number;
export interface Settings { day_night?:DayNight; id: number; size: number; area_size: number; plot_size: number; start_corner: string; notes: string | null }
export interface Era { id: Id; order_index: number; name: string; sigil_key: string | null; ring_from: number; ring_to: number; biome: string | null; palette: string; step_cost: number; darkness: number; description: string | null }
export interface Area { ax: number; ay: number; era_id: Id | null; status: string; draft_name: string | null; notes: string | null }
export const PLACE_KINDS = ['start','town','maze_entrance','echo_stone','landmark','well','rift','praem','npc_home','gate','note'] as const;
export const LINK_KINDS = ['clue','praem','gate','passage','rift','road'] as const;
export interface Place { id: Id; kind: string; name: string; x: number; y: number; maze_level: number | null; npc_key: string | null; status: string; notes: string | null }
export interface WorldLink { id: Id; from_place: Id; to_place: Id; kind: string; requirement: string | null; note: string | null }
export interface Sigil { drop_key: string; name?: string; icon_svg: string | null }
export interface WorldRows { terrain:Terrain[]; settings: Settings; eras: Era[]; areas: Area[]; places: Place[]; links: WorldLink[]; sigils: Sigil[] }
export const sameId = (a: Id | null | undefined, b: Id | null | undefined) => a != null && b != null && String(a) === String(b);
export function plotNumber(px: number, py: number): number {
  const X = px - 125, Y = 125 - py, k = Math.max(Math.abs(X), Math.abs(Y));
  if (k === 0) return 1;
  const m = (2*k+1)**2;
  if (Y === -k) return m-(k-X);
  if (X === -k) return m-2*k-(Y+k);
  if (Y === k) return m-4*k-(X+k);
  return m-6*k-(k-Y);
}
const primeCache = new Map<number, boolean>();
export function isPrime(n: number): boolean {
  const known = primeCache.get(n); if (known !== undefined) return known;
  let value = n >= 2;
  for(let d=2; d*d<=n && value; d++) if(n%d===0) value=false;
  primeCache.set(n,value); return value;
}
export function eraAt(eras: Era[], x: number, y: number): Era | undefined {
  const ring = Math.max(Math.abs(x-500), Math.abs(y-500));
  return [...eras].sort((a,b)=>a.order_index-b.order_index).find(e=>ring>=e.ring_from && ring<=e.ring_to);
}
export function ringWarnings(eras: Era[]): string[] {
  const sorted=[...eras].sort((a,b)=>a.ring_from-b.ring_from); const warnings:string[]=[]; let end=-1;
  for(const e of sorted){ if(e.ring_from>e.ring_to) warnings.push(`${e.name}: reversed range`); if(e.ring_from<=end) warnings.push(`Overlap at ${e.name}`); if(e.ring_from>end+1) warnings.push(`Gap ${end+1}–${e.ring_from-1}`); end=Math.max(end,e.ring_to); }
  if(end<500) warnings.push(`Gap ${end+1}–500`); return warnings;
}
export function mazeRoute(places: Place[], includeStart=false): Place[] {
 const route=places.filter(p=>p.kind==='maze_entrance' && p.maze_level != null).sort((a,b)=>(a.maze_level??0)-(b.maze_level??0));
 const start=places.find(p=>p.kind==='start'); return includeStart && start ? [start,...route] : route;
}
export function measureLeg(a: Place,b: Place,eras: Era[]) {
 const distance=Math.abs(a.x-b.x)+Math.abs(a.y-b.y); const samples=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/10));
 let cost=0; for(let i=0;i<=samples;i++) {const t=i/samples; cost+=Number(eraAt(eras,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t)?.step_cost??1);}
 return {distance,steps:distance*cost/(samples+1)};
}
