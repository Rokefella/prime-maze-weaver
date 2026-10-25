import type { CellState } from './types';
export interface MazeSkin { era_order:number; name:string; wall_keys:string[]; floor_keys:string[]; edge:{key:string;p:number}[]; junction_key:string|null; straight_key:string|null; darkness:number; accent:string; enabled:boolean; notes:string|null }
export interface LevelSkin { level_number:number; place_name:string; era_order:number; era_name:string; skin:MazeSkin|null }
export function skinHash(x:number,y:number,s:number):number {
 let a=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,1442695041))>>>0;
 a=Math.imul(a^(a>>>13),1274126177)>>>0;
 a=(a^(a>>>16))>>>0;
 return a/4294967296;
}
export const isSkinOpen=(cell:CellState|undefined)=>!!cell&&cell.type!=='WALL'&&cell.type!=='VEIL';
export function skinCell(cells:CellState[],width:number,x:number,y:number,skin:MazeSkin) {
 const open=(cx:number,cy:number)=>cx>=0&&cy>=0&&cx<width&&cy<Math.ceil(cells.length/width)&&isSkinOpen(cells[cy*width+cx]);
 const wall=cells[y*width+x]?.type==='WALL';
 if(wall){const keys=skin.wall_keys??[];return {key:skinHash(x,y,5)<.25?keys[Math.floor(skinHash(Math.floor(x/3),Math.floor(y/3),3)*keys.length)]:keys[0],edge:undefined,junction:undefined};}
 const keys=skin.floor_keys??[],bx=Math.floor(x/2),by=Math.floor(y/2);
 let key=skinHash(bx,by,6)<.35?keys[Math.floor(skinHash(bx,by,4)*keys.length)]:keys[0];
 const left=open(x-1,y),right=open(x+1,y),up=open(x,y-1),down=open(x,y+1);
 const count=Number(left)+Number(right)+Number(up)+Number(down);
 if(skin.straight_key&&count===2&&((left&&right)||(up&&down))&&skinHash(Math.floor(x/4),Math.floor(y/4),8)<.35)key=skin.straight_key;
 const nextToWall=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([cx,cy])=>cx>=0&&cy>=0&&cx<width&&cy<Math.ceil(cells.length/width)&&cells[cy*width+cx]?.type==='WALL');
 return {key,edge:nextToWall?(skin.edge??[]).find((entry,i)=>skinHash(x,y,17+i)<entry.p)?.key:undefined,junction:count>=3&&skin.junction_key&&skinHash(x,y,13)<.5?skin.junction_key:undefined};
}
/** Shared canvas adapter: skin base/details first, editor marks are drawn afterwards. */
export function drawSkinCell(ctx:CanvasRenderingContext2D,result:ReturnType<typeof skinCell>,x:number,y:number,w:number,h:number,colors:Map<string,string>,fallback:string,accent:string) {
 ctx.fillStyle=(result.key&&colors.get(result.key))||fallback;ctx.fillRect(x,y,w,h);
 if(result.junction){ctx.fillStyle=colors.get(result.junction)||accent;ctx.fillRect(x+w*.3,y+h*.3,w*.4,h*.4);}
 if(result.edge){ctx.fillStyle=colors.get(result.edge)||accent;ctx.beginPath();ctx.arc(x+w*.72,y+h*.28,Math.max(.6,Math.min(w,h)*.1),0,Math.PI*2);ctx.fill();}
}
export const SKIN_SAMPLE_WIDTH=15;
export const SKIN_SAMPLE_ROWS=['###############','#.....#.......#','#.###.#.###.#.#','#...#.....#.#.#','###.#####.#.#.#','#...#.....#...#','#.###.###.###.#','#.....#.......#','#.###.#.###.#.#','#...#.....#...#','###############'];
export const SKIN_SAMPLE:CellState[]=SKIN_SAMPLE_ROWS.flatMap(row=>[...row].map(c=>({type:c==='#'?'WALL':'CORRIDOR'} as CellState)));