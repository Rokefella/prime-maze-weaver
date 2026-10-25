import type { Place } from './model';

export type MapLayer = 0 | 1;
export interface UndergroundSettings { size: number; cell: number; legend: Record<string,string> }
export interface UnderRow { y:number; row:string }
export interface TerrainWindow { x0:number; y0:number; w:number; h:number; keys:string[]; rows:number[][] }
export interface WindowTile { x0:number; y0:number; w:number; h:number }
export const placeLayer=(p:Pick<Place,'layer'>):MapLayer=>p.layer===1?1:0;
export const layerCellSize=(layer:MapLayer)=>layer===1?4:1;
export function mapPoint(x:number,y:number,layer:MapLayer) {const cell=layerCellSize(layer);return {x:(x+.5)*cell,y:(y+.5)*cell};}
export function layerCoords(x:number,y:number,layer:MapLayer) {const cell=layerCellSize(layer),max=layer===1?249:999;return {x:Math.max(0,Math.min(max,Math.floor(x/cell))),y:Math.max(0,Math.min(max,Math.floor(y/cell)))};}
export function placeFacts(p:Place) {const point=mapPoint(p.x,p.y,placeLayer(p));return { ...point,ax:Math.floor(point.x/50),ay:Math.floor(point.y/50),px:Math.floor(point.x/4),py:Math.floor(point.y/4)};}
export function transitionTarget(p:Place) {
 if((p.action!=='descend'&&p.action!=='ascend')||(p.target_layer!==0&&p.target_layer!==1)||p.target_x==null||p.target_y==null)return null;
 return {layer:p.target_layer,...mapPoint(p.target_x,p.target_y,p.target_layer)};
}
export const tileKey=(tile:WindowTile)=>`${tile.x0},${tile.y0}`;
export function visibleTiles(x0:number,y0:number,x1:number,y1:number):WindowTile[] {
 const out:WindowTile[]=[];if(x1<=0||y1<=0||x0>=1000||y0>=1000)return out;
 for(let y=Math.floor(Math.max(0,y0)/128)*128;y<Math.min(1000,y1);y+=128)
  for(let x=Math.floor(Math.max(0,x0)/128)*128;x<Math.min(1000,x1);x+=128)out.push({x0:x,y0:y,w:Math.min(128,1000-x),h:Math.min(128,1000-y)});
 return out;
}
// Four read-only requests at a time; revisiting a tile shares its cached result.
export class TerrainWindowCache {
 readonly tiles=new Map<string,TerrainWindow>();
 private pending=new Map<string,WindowTile>();private active=new Set<string>();private failed=new Set<string>();private disposed=false;
 constructor(private load:(tile:WindowTile)=>Promise<TerrainWindow>,private changed:(error?:string)=>void) {}
 request(tiles:WindowTile[]) {this.pending.clear();for(const tile of tiles){const key=tileKey(tile);if(!this.tiles.has(key)&&!this.active.has(key)&&!this.failed.has(key))this.pending.set(key,tile);}this.pump();}
 retry(){this.failed.clear();}
 dispose(){this.disposed=true;this.pending.clear();}
 private pump(){if(this.disposed)return;while(this.active.size<4&&this.pending.size){const entry=this.pending.entries().next().value;if(!entry)return;const [key,tile]=entry;this.pending.delete(key);this.active.add(key);void this.load(tile).then(data=>{if(!this.disposed){this.tiles.set(key,data);this.changed();}}).catch(e=>{if(!this.disposed){this.failed.add(key);this.changed(e instanceof Error?e.message:String(e));}}).finally(()=>{this.active.delete(key);this.pump();});}}
}