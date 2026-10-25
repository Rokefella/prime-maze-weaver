import { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { Moon, Lock, LockOpen, Minus, Plus, Redo2, Scan, Undo2 } from 'lucide-react';
import { loadUnderground, loadTerrainWindow } from '@/lib/world/data';
import { layerCoords, mapPoint, placeLayer, transitionTarget, visibleTiles, tileKey, TerrainWindowCache, type MapLayer, type UnderRow } from '@/lib/world/layers';
import { Button } from '@/components/ui/button';
import { eraAt, isPrime, mazeRoute, plotNumber, sameId, type Id, type Place, type WorldRows } from '@/lib/world/model';

interface Props { layer:MapLayer; onLayer:(layer:MapLayer)=>void; terrainOverlay:boolean; onToggleTerrain:()=>void; night:boolean; onToggleNight:()=>void; rows:WorldRows; selectedPlace:Id|null; selectedArea:{ax:number;ay:number}|null; route:boolean; links:boolean; primes:boolean; addKind:string|null; locked:boolean; onToggleLock:()=>void; canUndo:boolean; canRedo:boolean; undoTip:string; redoTip:string; onUndo:()=>void; onRedo:()=>void; onPick:(x:number,y:number,place?:Place)=>void; onMove:(place:Place,x:number,y:number)=>void }
export function WorldMap(props:Props) {
 const canvasRef=useRef<HTMLCanvasElement>(null), host=useRef<HTMLDivElement>(null);
 const latest=useRef(props); latest.current=props;
 const transform=useRef(zoomIdentity), behavior=useRef<ZoomBehavior<HTMLCanvasElement,unknown>|null>(null);
 const redraw=useRef<()=>void>(()=>{}), fit=useRef<()=>void>(()=>{});
 const [hover,setHover]=useState<{x:number;y:number}|null>(null),[magnification,setMagnification]=useState(1);
 const [mapError,setMapError]=useState(''),[underLoading,setUnderLoading]=useState(false);
 const underRows=useRef<UnderRow[]|null>(null),underLoadingRef=useRef(false);
 const cacheRef=useRef<TerrainWindowCache|null>(null);
 useEffect(()=>{if(props.layer!==1||underRows.current||underLoadingRef.current)return;underLoadingRef.current=true;setUnderLoading(true);setMapError('');void loadUnderground().then(rows=>{underRows.current=rows;redraw.current();}).catch(e=>setMapError(e instanceof Error?e.message:String(e))).finally(()=>{underLoadingRef.current=false;setUnderLoading(false);});},[props.layer]);
 const drag=useRef<{place:Place;x:number;y:number;startX:number;startY:number}|null>(null);
 useEffect(()=>{
  const canvas=canvasRef.current, container=host.current; if(!canvas||!container) return;
  const ctx=canvas.getContext('2d'); if(!ctx) return;
  let width=0,height=0,base=1,frame=0;
  const css=getComputedStyle(container);
  const colors={background:css.getPropertyValue('--world-map-bg').trim(), grid:css.getPropertyValue('--world-map-grid').trim(), text:css.getPropertyValue('--world-map-text').trim(), gold:css.getPropertyValue('--world-gold').trim(), cyan:css.getPropertyValue('--world-cyan').trim(), teal:css.getPropertyValue('--world-teal').trim(), grey:css.getPropertyValue('--world-empty').trim(), blue:css.getPropertyValue('--world-proposed').trim(), purple:css.getPropertyValue('--world-generated').trim(), amber:css.getPropertyValue('--world-edited').trim(), green:css.getPropertyValue('--world-final').trim(), night:css.getPropertyValue('--night-tint').trim(), well:css.getPropertyValue('--world-well').trim()};
  const statusColors:Record<string,string>={empty:colors.grey,proposed:colors.blue,generated:colors.purple,edited:colors.amber,final:colors.green};
  const linkColors:Record<string,string>={clue:colors.gold,praem:colors.text,gate:colors.purple,passage:colors.grey,rift:colors.teal,road:colors.green};
  const visible=(x:number,y:number,pad=20)=>x>=-pad&&y>=-pad&&x<=width+pad&&y<=height+pad;
  const cache=new TerrainWindowCache(loadTerrainWindow,error=>{if(error)setMapError(error);redraw.current();});cacheRef.current=cache;
  const draw=()=>{
   frame=0; const {rows,selectedPlace,selectedArea,route,links,primes,layer,terrainOverlay}=latest.current; const t=transform.current;
   ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0); ctx.fillStyle=colors.background;ctx.fillRect(0,0,width,height);
   const scale=t.k, cell=(x:number,y:number)=>[t.x+x*scale,t.y+y*scale];
   const [minX,minY]=t.invert([0,0]),[maxX,maxY]=t.invert([width,height]);
   ctx.save();ctx.beginPath();ctx.rect(t.x,t.y,rows.settings.size*scale,rows.settings.size*scale);ctx.clip();
   if(layer===0)for(const area of rows.areas){const x=area.ax*50,y=area.ay*50; if(x+50<minX||y+50<minY||x>maxX||y>maxY)continue;
    const era=rows.eras.find(e=>sameId(e.id,area.era_id))??eraAt(rows.eras,x+24.5,y+24.5); const [sx,sy]=cell(x,y);
    ctx.globalAlpha=.7;ctx.fillStyle=era?.palette||colors.grey;ctx.fillRect(sx,sy,50*scale,50*scale);ctx.globalAlpha=1;
   }
   const terrainColors=new Map(rows.terrain.map(t=>[t.key,t.color||colors.grey]));
   const fillTerrain=(x:number,y:number,size:number,key:string|undefined)=>{const [sx,sy]=cell(x,y);ctx.fillStyle=key?terrainColors.get(key)||colors.grey:colors.grey;ctx.fillRect(sx,sy,size*scale+.3,size*scale+.3);};
   if(layer===1){
    const legend=rows.settings.underground?.legend??{};
    for(let y=Math.max(0,Math.floor(minY/4));y<=Math.min(249,Math.floor(maxY/4));y++){
     const row=underRows.current?.[y]?.row;if(!row)continue;
     for(let x=Math.max(0,Math.floor(minX/4));x<=Math.min(249,Math.floor(maxX/4));x++)fillTerrain(x*4,y*4,4,legend[row[x]]);
    }
   }
   if(layer===0&&terrainOverlay&&scale>=3){
    const tiles=visibleTiles(minX,minY,maxX,maxY);cache.request(tiles);
    for(const tile of tiles){const data=cache.tiles.get(tileKey(tile));
     if(data){for(let y=Math.max(data.y0,Math.floor(minY));y<Math.min(data.y0+data.h,Math.ceil(maxY));y++)for(let x=Math.max(data.x0,Math.floor(minX));x<Math.min(data.x0+data.w,Math.ceil(maxX));x++)fillTerrain(x,y,1,data.keys[data.rows[y-data.y0]?.[x-data.x0]]);}
     else{const [sx,sy]=cell(tile.x0,tile.y0);ctx.fillStyle=colors.background;ctx.globalAlpha=.6;ctx.fillRect(sx,sy,tile.w*scale,tile.h*scale);ctx.globalAlpha=1;ctx.strokeStyle=colors.grid;ctx.lineWidth=.5;ctx.beginPath();for(let n=0;n<=128;n+=4){const [x,y]=cell(tile.x0+n,tile.y0+n);if(n<=tile.w){ctx.moveTo(x,sy);ctx.lineTo(x,sy+tile.h*scale);}if(n<=tile.h){ctx.moveTo(sx,y);ctx.lineTo(sx+tile.w*scale,y);}}ctx.stroke();}
    }
   }else cache.request([]);
   ctx.lineWidth=.8;ctx.strokeStyle=colors.grid;ctx.beginPath();
   for(let n=0;n<=1000;n+=50){const [x,y]=cell(n,n);ctx.moveTo(x,t.y);ctx.lineTo(x,t.y+1000*scale);ctx.moveTo(t.x,y);ctx.lineTo(t.x+1000*scale,y);}ctx.stroke();
   ctx.lineWidth=1;ctx.strokeStyle=colors.text;ctx.globalAlpha=.45;
   if(layer===0)for(const era of rows.eras)for(const radius of [era.ring_from,era.ring_to]){const [x,y]=cell(500-radius,500-radius);ctx.strokeRect(x,y,2*radius*scale,2*radius*scale);}ctx.globalAlpha=1;
   if(layer===0&&t.k/base>=2){ctx.font='10px sans-serif';for(const area of rows.areas){const [x,y]=cell(area.ax*50+3,area.ay*50+5);if(!visible(x,y))continue;ctx.fillStyle=colors.text;ctx.fillText(`A ${area.ax},${area.ay}`,x,y+7);ctx.fillStyle=statusColors[area.status]??colors.grey;ctx.beginPath();ctx.arc(x+4,y+17,2.8,0,Math.PI*2);ctx.fill();}}
   if(primes&&scale*4>=6){ctx.fillStyle=colors.text;ctx.globalAlpha=.8;for(let py=Math.max(0,Math.floor(minY/4));py<=Math.min(249,Math.floor(maxY/4));py++)for(let px=Math.max(0,Math.floor(minX/4));px<=Math.min(249,Math.floor(maxX/4));px++)if(isPrime(plotNumber(px,py))){const [x,y]=cell(px*4+2,py*4+2);ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
   const position=(p:Place)=>drag.current&&sameId(p.id,drag.current.place.id)?{...p,x:drag.current.x,y:drag.current.y}:p;
   const line=(places:Place[],color:string,dashed:boolean)=>{ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.setLineDash(dashed?[6,5]:[]);ctx.beginPath();places.forEach((raw,i)=>{const p=position(raw);const point=mapPoint(p.x,p.y,placeLayer(p));const [x,y]=cell(point.x,point.y);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();ctx.setLineDash([]);};
   const places=rows.places.filter(p=>placeLayer(p)===layer);
   if(route)line(mazeRoute(places,true),colors.gold,true);
   if(links)for(const link of rows.links){const a=rows.places.find(p=>sameId(p.id,link.from_place)),b=rows.places.find(p=>sameId(p.id,link.to_place));if(a&&b&&placeLayer(a)===layer&&placeLayer(b)===layer)line([a,b],linkColors[link.kind]??colors.grey,false);}
   for(const raw of rows.places){const p=position(raw),target=transitionTarget(p);if(!target)continue;const source=mapPoint(p.x,p.y,placeLayer(p));const [sx,sy]=cell(source.x,source.y),[tx,ty]=cell(target.x,target.y);
    if(placeLayer(p)===layer){ctx.strokeStyle=colors.cyan;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(tx,ty);ctx.stroke();}
    if(target.layer===layer){ctx.strokeStyle=colors.cyan;ctx.lineWidth=1;ctx.beginPath();ctx.arc(tx,ty,3,0,Math.PI*2);ctx.stroke();}
   }
   if(layer===0&&selectedArea){const [x,y]=cell(selectedArea.ax*50,selectedArea.ay*50);ctx.strokeStyle=colors.gold;ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,50*scale-2,50*scale-2);}
   for(const raw of places){const p=position(raw);const point=mapPoint(p.x,p.y,placeLayer(p));const [x,y]=cell(point.x,point.y);if(!visible(x,y,80))continue;
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=p.status==='proposed'?.6:1;ctx.lineWidth=1.6;
    const color=p.kind==='maze_entrance'?colors.gold:p.kind==='echo_stone'?colors.cyan:p.kind==='rift'?colors.amber:colors.text;
    ctx.fillStyle=color;ctx.strokeStyle=color;
    if(p.kind==='start'){ctx.beginPath();ctx.moveTo(-4,7);ctx.lineTo(-4,-9);ctx.stroke();ctx.fillRect(-4,-9,10,7);}
    else if(p.kind==='town'){ctx.beginPath();ctx.moveTo(-8,-1);ctx.lineTo(0,-8);ctx.lineTo(8,-1);ctx.closePath();ctx.fill();ctx.strokeRect(-5,0,10,8);}
    else if(p.kind==='maze_entrance'){ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(11,0);ctx.lineTo(0,11);ctx.lineTo(-11,0);ctx.closePath();ctx.fill();ctx.fillStyle=colors.background;ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(String(p.maze_level??'?'),0,3);}
    else if(p.kind==='landmark'){ctx.strokeRect(-5,-7,10,15);ctx.fillRect(-7,-10,4,4);ctx.fillRect(-2,-10,4,4);ctx.fillRect(3,-10,4,4);}
    else if(p.kind==='well'){ctx.strokeStyle=colors.well;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=colors.text;ctx.lineWidth=1;ctx.stroke();}
    else if(p.kind==='rift'){ctx.beginPath();ctx.arc(-2,0,6,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.strokeStyle=colors.teal;ctx.beginPath();ctx.arc(2,0,6,Math.PI/2,Math.PI*1.5);ctx.stroke();}
    else if(p.kind==='praem'){ctx.beginPath();for(let n=0;n<10;n++){const a=n*Math.PI/5-Math.PI/2,r=n%2?4:9;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}
    else if(p.kind==='gate'){ctx.strokeRect(-6,-1,12,9);ctx.beginPath();ctx.arc(0,-1,4,Math.PI,0);ctx.stroke();}
    else {ctx.beginPath();ctx.arc(0,0,p.kind==='note'?2:p.kind==='npc_home'?6:5,0,Math.PI*2);ctx.fill();if(p.kind==='npc_home'){ctx.fillStyle=colors.teal;ctx.beginPath();ctx.arc(-2,-2,2,0,Math.PI*2);ctx.fill();}}
    if(p.status==='proposed'){ctx.strokeStyle=color;ctx.setLineDash([3,3]);ctx.strokeRect(-13,-14,26,28);ctx.setLineDash([]);}
    if(sameId(p.id,selectedPlace)){ctx.globalAlpha=1;ctx.strokeStyle=colors.gold;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.stroke();}
    if(t.k/base>=2){ctx.fillStyle=colors.text;ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText(p.name||p.kind,0,25);}
    ctx.restore();
   }
   if(latest.current.night){ctx.globalAlpha=.42;ctx.fillStyle=colors.night;ctx.fillRect(t.x,t.y,rows.settings.size*scale,rows.settings.size*scale);ctx.globalAlpha=1;}
   ctx.restore();
  };
  redraw.current=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  const sel=select<HTMLCanvasElement,unknown>(canvas);
  const z=zoom<HTMLCanvasElement,unknown>().scaleExtent([.05,30]).wheelDelta(e=>-e.deltaY*(e.deltaMode===1?.05:e.deltaMode?1:.002)).filter(e=>e.type==='wheel'||(!latest.current.addKind&&!drag.current&&!e.button)).on('zoom',e=>{transform.current=e.transform;setMagnification(e.transform.k/base);redraw.current();});
  behavior.current=z;sel.call(z);
  // D3 owns wheel/pan/pinch; pointer dragging a marker suppresses map panning.
  fit.current=()=>{base=Math.max(.05,Math.min((width-48)/1000,(height-48)/1000));sel.call(z.transform,zoomIdentity.translate((width-1000*base)/2,(height-1000*base)/2).scale(base));};
  const resize=()=>{width=container.clientWidth;height=container.clientHeight;if(!width||!height)return;const dpr=window.devicePixelRatio||1;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);fit.current();};
  const observer=new ResizeObserver(resize);observer.observe(container);
  return()=>{cache.dispose();cacheRef.current=null;observer.disconnect();sel.on('.zoom',null);if(frame)cancelAnimationFrame(frame);};
 },[]);
 useEffect(()=>{redraw.current();},[props]);
 const coords=(e:React.PointerEvent)=>{const box=e.currentTarget.getBoundingClientRect();const [x,y]=transform.current.invert([e.clientX-box.left,e.clientY-box.top]);return layerCoords(x,y,props.layer);};
 const hit=(e:React.PointerEvent)=>{const box=e.currentTarget.getBoundingClientRect();return [...props.rows.places].filter(p=>placeLayer(p)===props.layer).reverse().find(p=>{const point=mapPoint(p.x,p.y,placeLayer(p));const [x,y]=transform.current.apply([point.x,point.y]);return Math.hypot(x-(e.clientX-box.left),y-(e.clientY-box.top))<14;});};
 const down=useRef<{x:number;y:number}|null>(null);
 const zoomBy=(factor:number)=>{const canvas=canvasRef.current,z=behavior.current;if(canvas&&z)select<HTMLCanvasElement,unknown>(canvas).call(z.scaleBy,factor);};
 const hoverPoint=hover?mapPoint(hover.x,hover.y,props.layer):null;const era=hoverPoint?eraAt(props.rows.eras,hoverPoint.x,hoverPoint.y):undefined;const number=hoverPoint?plotNumber(Math.floor(hoverPoint.x/4),Math.floor(hoverPoint.y/4)):0;
 return <div ref={host} className="world-map relative min-h-[420px] flex-1 overflow-hidden">
  <canvas ref={canvasRef} aria-label="Open world map" className="h-full w-full touch-none" onPointerDown={e=>{if(e.button!==0)return;down.current={x:e.clientX,y:e.clientY};const p=hit(e);if(p&&!props.addKind&&!props.locked&&sameId(p.id,props.selectedPlace)){const c=coords(e);drag.current={place:p,x:p.x,y:p.y,startX:c.x,startY:c.y};e.currentTarget.setPointerCapture(e.pointerId);}}} onPointerMove={e=>{const c=coords(e);setHover(c);if(drag.current){drag.current={...drag.current,...c};redraw.current();}}} onPointerUp={e=>{const c=coords(e),p=drag.current;const moved=down.current&&Math.hypot(e.clientX-down.current.x,e.clientY-down.current.y)>4;if(p){const cellDistance=Math.hypot(c.x-p.startX,c.y-p.startY);if(cellDistance>=3)props.onMove(p.place,c.x,c.y);else props.onPick(c.x,c.y,p.place);}else if(!moved)props.onPick(c.x,c.y,hit(e));drag.current=null;down.current=null;redraw.current();}} onPointerCancel={()=>{drag.current=null;down.current=null;redraw.current();}} onPointerLeave={()=>setHover(null)} />
   <div className="absolute left-3 right-3 top-3 flex flex-wrap items-center gap-1 border border-border bg-background/90 p-1">
    <div className="flex border border-border" role="group" aria-label="Map layer">{([0,1] as const).map(layer=><Button key={layer} size="sm" variant={props.layer===layer?'secondary':'ghost'} aria-pressed={props.layer===layer} onClick={()=>{setHover(null);setMapError('');props.onLayer(layer);}}>{layer===0?'SURFACE':'UNDERGROUND'}</Button>)}</div>
    <Button size="sm" variant={props.terrainOverlay?'secondary':'ghost'} aria-pressed={props.terrainOverlay} disabled={props.layer===1} title="Generated surface terrain" onClick={()=>{cacheRef.current?.retry();setMapError('');props.onToggleTerrain();}}>TERRAIN</Button>
    <Button size="sm" variant={props.night?'secondary':'ghost'} aria-pressed={props.night} onClick={props.onToggleNight}><Moon/> NIGHT PREVIEW</Button>
    <Button size="sm" variant="ghost" disabled={!props.canUndo} title={props.undoTip} aria-label={props.undoTip} onClick={props.onUndo}><Undo2/> UNDO</Button><Button size="sm" variant="ghost" disabled={!props.canRedo} title={props.redoTip} aria-label={props.redoTip} onClick={props.onRedo}><Redo2/> REDO</Button><Button size="sm" variant={props.locked?'secondary':'ghost'} title={props.locked?'Places locked: dragging pans the map':'Places unlocked: drag a selected place to move it'} aria-pressed={props.locked} onClick={props.onToggleLock}>{props.locked?<Lock/>:<LockOpen/>} LOCK PLACES</Button>
    <Button size="icon" variant="ghost" title="Zoom in" aria-label="Zoom in" onClick={()=>zoomBy(1.4)}><Plus/></Button><Button size="icon" variant="ghost" title="Zoom out" aria-label="Zoom out" onClick={()=>zoomBy(1/1.4)}><Minus/></Button><Button size="sm" variant="ghost" onClick={()=>fit.current()}><Scan/> FIT</Button><span className="w-12 text-center text-xs tabular-nums">{magnification.toFixed(1)}×</span>
  </div>
  <div className="pointer-events-none absolute bottom-3 left-3 border border-border bg-background/90 px-3 py-2 text-[11px] tabular-nums" aria-live="off">{hover?<>{props.layer===1?'Underground cell':'Cell'} {hover.x},{hover.y} · Area {Math.floor((hoverPoint?.x??0)/50)},{Math.floor((hoverPoint?.y??0)/50)} · {era?.name??'No era'}<br/>Plot {number} · {isPrime(number)?'Prime':'Not prime'}</>:props.layer===1?'250 × 250 underground · 4 × 4 surface blocks':'1000 × 1000 · 20 × 20 areas'}</div>
  {(mapError||underLoading||(props.layer===0&&props.terrainOverlay&&transform.current.k<3))&&<div className="absolute bottom-16 right-3 max-w-[80%] border border-border bg-background/90 px-3 py-2 text-xs" role={mapError?'alert':'status'}>{mapError|| (underLoading?'Loading underground…':'Terrain · zoom to 3 px/cell')}{mapError&&<Button size="sm" variant="ghost" onClick={()=>{setMapError('');cacheRef.current?.retry();redraw.current();if(props.layer===1)props.onLayer(0);}}>Retry</Button>}</div>}
 </div>;
}
