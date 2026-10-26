import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { loadFinds, loadFindDrops } from '@/lib/world/findsData';
import { countFinds, FIND_KINDS, FIND_LABELS, findIconUri, findMarker, type FindDrop, type WorldFind } from '@/lib/world/finds';
import type { Terrain } from '@/lib/world/terrain';

export function useFinds() {
 const [rows,setRows]=useState<WorldFind[]>([]),[drops,setDrops]=useState<FindDrop[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setError('');
 void Promise.allSettled([loadFinds(),loadFindDrops()]).then(([finds,names])=>{
  if(!live)return;
  if(finds.status==='fulfilled')setRows(finds.value);
  if(names.status==='fulfilled')setDrops(names.value);
  const errors=[finds,names].flatMap(r=>r.status==='rejected'?[r.reason instanceof Error?r.reason.message:String(r.reason)]:[]);
  setError(errors.join(' · '));setLoading(false);
 });return()=>{live=false;};},[attempt]);
 return {rows,drops,loading,error,retry:()=>setAttempt(n=>n+1)};
}

export function FindsLayer({rows,terrain,transform,selected,onSelect}:{rows:WorldFind[];terrain:Terrain[];transform:{x:number;y:number;k:number};selected:string|number|null;onSelect:(find:WorldFind)=>void}) {
 return <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-label="Find markers">
  {rows.map(f=>{
   const svg=terrain.find(t=>t.key===f.sprite_key)?.icon_svg;
   const marker=findMarker(f,transform,Boolean(svg));
   return <Button key={f.id} size="icon" variant="ghost" className={`find-marker find-${f.kind} ${marker.hidden?'find-hidden':''} ${String(selected)===String(f.id)?'find-selected':''}`}
    style={{left:marker.x,top:marker.y}} aria-label={`Find: ${f.title||f.find_key}`} title={f.title||f.find_key}
    onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}
    onClick={e=>{e.stopPropagation();onSelect(f);}}>
     {marker.icon&&svg?<img className="find-icon" src={findIconUri(svg)} alt="" draggable={false} onError={e=>{e.currentTarget.hidden=true;}}/>:<span className="find-dot"/>}
   </Button>;
  })}
 </div>;
}

export function FindsLegend({rows,total,onOpen}:{rows:WorldFind[];total:number;onOpen:()=>void}) {
 const counts=countFinds(rows);
 return <div className="absolute bottom-3 right-3 max-w-[55%] border border-border bg-background/90 p-2 text-[10px]">
  <Button size="sm" variant="ghost" className="h-6 px-1 text-xs" onClick={onOpen}>{total} finds <span className="text-muted-foreground">· {rows.length} shown</span></Button>
  <div className="grid grid-cols-2 gap-x-3 gap-y-1">{FIND_KINDS.map(kind=><span key={kind} className={`find-${kind} flex items-center gap-1`}><i className="find-legend-dot"/>{FIND_LABELS[kind]} <span className="ml-auto tabular-nums">{counts[kind]}</span></span>)}</div>
 </div>;
}