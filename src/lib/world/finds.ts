import { mapPoint, type MapLayer } from './layers';

export const FIND_KINDS = ['cache_steps','cache_credits','thing','tool','words','quest_object','landmark','sigil'] as const;
export type FindKind = typeof FIND_KINDS[number];
export interface WorldFind {
 id:string|number; find_key:string; x:number; y:number; layer:MapLayer; kind:FindKind;
 drop_key:string|null; amount:number|null; title:string|null; text:string|null;
 visibility:'glint'|'hidden'|'visible'; glint_radius:number|null; sprite_key:string|null;
 quest_key:string|null; requires_flags:unknown; grants_flags:unknown; note:string|null;
}
export interface FindDrop { drop_key:string; name:string }
export const FIND_LABELS:Record<FindKind,string> = {cache_steps:'Steps',cache_credits:'Credits',thing:'Thing',tool:'Tool',words:'Words',quest_object:'Quest object',landmark:'Landmark',sigil:'Sigil'};
export const NO_QUEST = 'no quest';
export function filterFinds(rows:WorldFind[],layer:MapLayer,kinds:ReadonlySet<FindKind>,quests:ReadonlySet<string>) {
 return rows.filter(f=>f.layer===layer&&kinds.has(f.kind)&&quests.has(f.quest_key??NO_QUEST));
}
export function countFinds(rows:WorldFind[]) {
 const counts=Object.fromEntries(FIND_KINDS.map(kind=>[kind,0])) as Record<FindKind,number>;
 for(const f of rows) if(f.kind in counts) counts[f.kind]++;
 return counts;
}
export function findMarker(f:WorldFind,t:{x:number;y:number;k:number},hasSprite:boolean) {
 const point=mapPoint(f.x,f.y,f.layer);
 const icon=hasSprite&&t.k>=3;
 return {x:t.x+point.x*t.k,y:t.y+point.y*t.k,size:icon?24:10,icon,hidden:f.visibility==='hidden'};
}
export const findIconUri=(svg:string)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;