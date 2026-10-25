import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { WorldMap } from './WorldMap';
import { AreaEditor, EraEditor, LinksEditor, MeasureEditor, PlaceEditor, type LinkDraft } from './WorldEditors';
import { createAreaDraft, findDraft, insertRow, loadWorld, removeRow, saveRow } from '@/lib/world/data';
import { sameId, type Area, type Id, type Place, type WorldLink, type WorldRows } from '@/lib/world/model';
import type { SavedLevel } from '@/lib/maze/types';
const TABS=['ERAS','AREA','PLACES','LINKS','MEASURE'] as const;
export function WorldWorkspace({onOpenDraft}:{onOpenDraft:(draft:SavedLevel)=>boolean}) {
 const [rows,setRows]=useState<WorldRows|null>(null),[tab,setTab]=useState<typeof TABS[number]>('ERAS');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const loading=useRef(false),lock=useRef(false);
 const [areaKey,setAreaKey]=useState<{ax:number;ay:number}|null>(null),[placeId,setPlaceId]=useState<Id|null>(null);
 const [route,setRoute]=useState(true),[links,setLinks]=useState(false),[primes,setPrimes]=useState(false);
 const [addKind,setAddKind]=useState<string|null>(null),[kindFilter,setKindFilter]=useState(''),[eraFilter,setEraFilter]=useState('');
 const [linkDraft,setLinkDraft]=useState<LinkDraft>({from_place:'',to_place:'',kind:'clue',requirement:'',note:''}),[linkPick,setLinkPick]=useState<'from'|'to'|null>(null);
 const [measureIds,setMeasureIds]=useState<Id[]>([]),[measurePick,setMeasurePick]=useState(false);
 const load=async()=>{if(loading.current)return;loading.current=true;setError('');try{setRows(await loadWorld());}catch(e){setError(e instanceof Error?e.message:String(e));}finally{loading.current=false;}};
 useEffect(()=>{void load();},[]);
 const run=async(task:()=>Promise<void>,message:string)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await task();setNotice(message);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{lock.current=false;setBusy(false);}};
 const changeArea=(a:Area)=>setRows(r=>r?{...r,areas:r.areas.map(old=>old.ax===a.ax&&old.ay===a.ay?a:old)}:r);
 const changePlace=(p:Place)=>setRows(r=>r?{...r,places:r.places.map(old=>sameId(old.id,p.id)?p:old)}:r);
 if(!rows)return <div className="flex h-full items-center justify-center bg-background"><div className="max-w-lg p-6 text-center">{error?<><p role="alert" className="mb-4 text-sm text-destructive">{error}</p><Button variant="outline" onClick={()=>void load()}>Retry WORLD</Button></>:<p className="font-display text-sm">Loading world…</p>}</div></div>;
 const area=rows.areas.find(a=>a.ax===areaKey?.ax&&a.ay===areaKey?.ay)??null;
 const place=rows.places.find(p=>sameId(p.id,placeId))??null;
 const pick=(x:number,y:number,p?:Place)=>{
  if(busy)return;
  if(addKind){void run(async()=>{const added=await insertRow<Place>('world_places',{kind:addKind,name:'',x,y,maze_level:null,npc_key:null,status:'proposed',notes:''});setRows(r=>r?{...r,places:[...r.places,added]}:r);setPlaceId(added.id);setAddKind(null);setTab('PLACES');},'Place created');return;}
  if(p){setPlaceId(p.id);if(tab==='LINKS'&&linkPick){setLinkDraft(l=>({...l,[`${linkPick}_place`]:String(p.id)}));setLinkPick(null);}else if(tab==='MEASURE'&&measurePick){setMeasureIds(ids=>[...ids,p.id]);}else setTab('PLACES');return;}
  setAreaKey({ax:Math.floor(x/50),ay:Math.floor(y/50)});setTab('AREA');
 };
 const move=(p:Place,x:number,y:number)=>{if(busy)return;setPlaceId(p.id);void run(async()=>{const saved=await saveRow('world_places',{x,y},{id:p.id});changePlace({...p,...saved});},'Place position saved');};
 const deleteLink=(l:WorldLink)=>void run(async()=>{await removeRow('world_links',l.id);setRows(r=>r?{...r,links:r.links.filter(old=>!sameId(old.id,l.id))}:r);},'Link deleted');
 return <div className="world-workspace flex h-full flex-col bg-background text-foreground">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
   <div><h1 className="font-display text-base">WORLD <span className="ml-2 text-xs text-muted-foreground">{rows.settings.size.toLocaleString()} × {rows.settings.size.toLocaleString()}</span></h1><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{rows.eras.length} eras · {rows.areas.length} areas · {rows.places.length} places</p></div>
   <div className="flex flex-wrap gap-4 text-xs">{[{name:'Maze route',value:route,set:setRoute},{name:'Links',value:links,set:setLinks},{name:'Prime plots',value:primes,set:setPrimes}].map(t=><label key={t.name} className="flex items-center gap-2"><input type="checkbox" checked={t.value} onChange={e=>t.set(e.target.checked)}/>{t.name}</label>)}</div>
  </div>
  <div className="flex min-h-0 flex-1 flex-col md:flex-row">
   <WorldMap rows={rows} selectedPlace={placeId} selectedArea={areaKey} route={route} links={links} primes={primes} addKind={addKind} onPick={pick} onMove={move}/>
   <aside className="world-side flex min-h-0 flex-col border-t border-border md:border-l md:border-t-0">
    <nav className="grid shrink-0 grid-cols-5 border-b border-border" aria-label="World panels">{TABS.map(t=><Button key={t} className="rounded-none px-1 text-[10px]" size="sm" variant={tab===t?'secondary':'ghost'} aria-pressed={tab===t} onClick={()=>{setTab(t);setAddKind(null);setLinkPick(null);setMeasurePick(false);}}>{t}</Button>)}</nav>
    {(error||notice||busy)&&<div className="border-b border-border px-3 py-2 text-xs" role={error?'alert':'status'}>{error|| (busy?'Saving…':notice)}</div>}
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
     {tab==='ERAS'&&<EraEditor rows={rows} busy={busy} onChange={e=>setRows(r=>r?{...r,eras:r.eras.map(old=>sameId(old.id,e.id)?e:old)}:r)} onSave={e=>void run(async()=>{const saved=await saveRow('world_eras',e,{id:e.id});setRows(r=>r?{...r,eras:r.eras.map(old=>sameId(old.id,e.id)?saved:old)}:r);},'Era saved')}/>}
     {tab==='AREA'&&<AreaEditor rows={rows} area={area} busy={busy} onChange={changeArea} onSave={a=>void run(async()=>changeArea(await saveRow('world_areas',a,{ax:a.ax,ay:a.ay})),'Area saved')} onCreate={()=>{if(area)void run(async()=>changeArea(await createAreaDraft(area)),'Area draft created');}} onOpen={()=>{if(area?.draft_name)void run(async()=>{const draft=await findDraft(area.draft_name??'');if(!onOpenDraft(draft))throw new Error('Opening draft cancelled; builder work preserved.');},'Draft opened');}}/>}
     {tab==='PLACES'&&<PlaceEditor rows={rows} selected={place} kindFilter={kindFilter} eraFilter={eraFilter} onFilter={(k,e)=>{setKindFilter(k);setEraFilter(e);}} onSelect={setPlaceId} onChange={changePlace} onSave={p=>void run(async()=>changePlace(await saveRow('world_places',p,{id:p.id})),'Place saved')} onDelete={p=>{if(window.confirm(`Delete ${p.name||'this place'} and its links?`))void run(async()=>{for(const l of rows.links.filter(l=>sameId(l.from_place,p.id)||sameId(l.to_place,p.id)))await removeRow('world_links',l.id);await removeRow('world_places',p.id);setRows(r=>r?{...r,places:r.places.filter(old=>!sameId(old.id,p.id)),links:r.links.filter(l=>!sameId(l.from_place,p.id)&&!sameId(l.to_place,p.id))}:r);setPlaceId(null);},'Place deleted');}} addKind={addKind} onAdd={setAddKind} busy={busy}/>}
     {tab==='LINKS'&&<LinksEditor rows={rows} draft={linkDraft} onChange={setLinkDraft} onCreate={()=>void run(async()=>{const a=rows.places.find(p=>String(p.id)===linkDraft.from_place),b=rows.places.find(p=>String(p.id)===linkDraft.to_place);if(!a||!b)throw new Error('Select both places.');const link=await insertRow<WorldLink>('world_links',{...linkDraft,from_place:a.id,to_place:b.id});setRows(r=>r?{...r,links:[...r.links,link]}:r);setLinkDraft(l=>({...l,requirement:'',note:''}));},'Link created')} onDelete={deleteLink} onPick={side=>setLinkPick(linkPick===side?null:side)} picking={linkPick} busy={busy}/>}
     {tab==='MEASURE'&&<MeasureEditor rows={rows} ids={measureIds} onChange={setMeasureIds} onPick={()=>setMeasurePick(!measurePick)} picking={measurePick}/>}
    </div>
   </aside>
  </div>
 </div>;
}
