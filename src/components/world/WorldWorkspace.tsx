import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TerrainPanel } from './TerrainPanel';
import { DayNightEditor } from './DayNightEditor';
import { saveTerrain } from '@/lib/world/terrainData';
import type { Terrain, DayNight } from '@/lib/world/terrain';
import { WorldMap } from './WorldMap';
import { AreaEditor, EraEditor, LinksEditor, MeasureEditor, PlaceEditor, type LinkDraft } from './WorldEditors';
import { createAreaDraft, findDraft, insertRow, loadWorld, removeRow, saveRow } from '@/lib/world/data';
import { pushStep, writeLabel, type WorldWrite } from '@/lib/world/history';
import { placeLayer, type MapLayer } from '@/lib/world/layers';
import { sameId, type Area, type Era, type Id, type Place, type WorldLink, type WorldRows } from '@/lib/world/model';
import type { SavedLevel } from '@/lib/maze/types';
const TABS=['ERAS','AREA','PLACES','LINKS','MEASURE','TERRAIN'] as const;
type Snapshot=Place|Era|Area|WorldLink|Terrain|DayNight;
export function WorldWorkspace({onOpenDraft,active}:{onOpenDraft:(draft:SavedLevel)=>boolean;active:boolean}) {
 const [rows,setRows]=useState<WorldRows|null>(null),[tab,setTab]=useState<typeof TABS[number]>('ERAS');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const loading=useRef(false),lock=useRef(false);
 const [areaKey,setAreaKey]=useState<{ax:number;ay:number}|null>(null),[placeId,setPlaceId]=useState<Id|null>(null);
 const [route,setRoute]=useState(true),[links,setLinks]=useState(false),[primes,setPrimes]=useState(false);
 const [addKind,setAddKind]=useState<string|null>(null),[kindFilter,setKindFilter]=useState(''),[eraFilter,setEraFilter]=useState('');
 const [linkDraft,setLinkDraft]=useState<LinkDraft>({from_place:'',to_place:'',kind:'clue',requirement:'',note:''}),[linkPick,setLinkPick]=useState<'from'|'to'|null>(null);
 const [measureIds,setMeasureIds]=useState<Id[]>([]),[measurePick,setMeasurePick]=useState(false);
 const [layer,setLayer]=useState<MapLayer>(0),[layerFilter,setLayerFilter]=useState('0'),[terrainOverlay,setTerrainOverlay]=useState(false);
 const [locked,setLocked]=useState(true);
 const [terrainKey,setTerrainKey]=useState<string|null>(null),[night,setNight]=useState(false);
 const [history,setHistory]=useState<WorldWrite[]>([]),[redoStack,setRedoStack]=useState<WorldWrite[]>([]);
 // Last saved value per row, so optimistic edits still have a true "before".
 const savedSnap=useRef(new Map<string,Snapshot>());
 // Re-inserted rows get new ids; later steps still reference the original id.
 const idRemap=useRef(new Map<string,Id>());
 const snapKey=(w:WorldWrite)=>w.type==='update-day-night'?'day-night':w.type==='update-terrain'||w.type==='insert-terrain'?`terrain:${w.key}`:w.type==='update-area'?`area:${w.before.ax},${w.before.ay}`:w.type==='update-place'||w.type==='insert-place'||w.type==='delete-place'?`place:${w.id}`:w.type==='update-era'?`era:${w.id}`:`link:${w.id}`;
 const snap=<T extends Snapshot>(key:string):T|undefined=>savedSnap.current.get(key) as T|undefined;
 const remember=(key:string,row:Snapshot|undefined)=>{if(row===undefined)savedSnap.current.delete(key);else savedSnap.current.set(key,row);};
 const load=async()=>{if(loading.current)return;loading.current=true;setError('');try{const world=await loadWorld();setRows(world);savedSnap.current.clear();if(world.settings.day_night)remember('day-night',world.settings.day_night);for(const t of world.terrain)remember(`terrain:${t.key}`,t);for(const e of world.eras)remember(`era:${e.id}`,e);for(const a of world.areas)remember(`area:${a.ax},${a.ay}`,a);for(const p of world.places)remember(`place:${p.id}`,p);for(const l of world.links)remember(`link:${l.id}`,l);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{loading.current=false;}};
 useEffect(()=>{void load();},[]);
 const run=async(task:()=>Promise<void>,message:string)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await task();setNotice(message);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{lock.current=false;setBusy(false);}};
 const resolveId=(id:Id):Id=>idRemap.current.get(String(id))??id;
 const withoutId=<T extends {id?:Id}>(row:T)=>{const copy={...row};delete copy.id;return copy;};
 const changeArea=(a:Area)=>setRows(r=>r?{...r,areas:r.areas.map(old=>old.ax===a.ax&&old.ay===a.ay?a:old)}:r);
 const changePlace=(p:Place)=>setRows(r=>r?{...r,places:r.places.map(old=>sameId(old.id,p.id)?p:old)}:r);
 const record=(step:WorldWrite)=>{setHistory(h=>pushStep(h,step));setRedoStack([]);};
 // Replays one step against the existing tables; undo writes before, redo writes after.
 const apply=async(w:WorldWrite,dir:'undo'|'redo')=>{
  const back=dir==='undo';
  if(w.type==='update-terrain'||w.type==='insert-terrain'){const target=w.type==='update-terrain'?(back?w.before:w.after):{...w.row,enabled:back?false:w.row.enabled};const saved=await saveTerrain(target);setRows(r=>r?{...r,terrain:r.terrain.map(t=>t.key===w.key?saved:t)}:r);remember(`terrain:${w.key}`,saved);return;}
  if(w.type==='update-day-night'){const target=back?w.before:w.after;const saved=await saveRow<WorldRows['settings']>('world_settings',{day_night:target} as WorldRows['settings'],{id:1});setRows(r=>r?{...r,settings:{...r.settings,...saved}}:r);remember('day-night',saved.day_night??target);return;}

  if(w.type==='update-place'){const id=resolveId(w.id);const target=back?w.before:w.after;const saved=await saveRow('world_places',withoutId(target),{id});const next={...target,...saved,id};setRows(r=>r?{...r,places:r.places.map(p=>sameId(p.id,id)?next:p)}:r);remember(`place:${w.id}`,next);return;}
  if(w.type==='update-era'){const id=resolveId(w.id);const target=back?w.before:w.after;const saved=await saveRow('world_eras',withoutId(target),{id});const next={...target,...saved,id};setRows(r=>r?{...r,eras:r.eras.map(e=>sameId(e.id,id)?next:e)}:r);remember(`era:${w.id}`,next);return;}
  if(w.type==='update-area'){const target=back?w.before:w.after;const saved=await saveRow('world_areas',target,{ax:w.before.ax,ay:w.before.ay});changeArea({...target,...saved});remember(snapKey(w),{...target,...saved});return;}
  if(w.type==='insert-place'){
   if(back){await removeRow('world_places',resolveId(w.id));setRows(r=>r?{...r,places:r.places.filter(p=>!sameId(p.id,resolveId(w.id)))}:r);remember(`place:${w.id}`,undefined);}
   else{const added=await insertRow<Place>('world_places',withoutId(w.row));idRemap.current.set(String(w.id),added.id);setRows(r=>r?{...r,places:[...r.places,added]}:r);remember(`place:${w.id}`,added);}
   return;}
  if(w.type==='insert-link'||w.type==='delete-link'){
   const inserting=w.type==='delete-link'?back:!back;
   if(inserting){const values={...withoutId(w.row),from_place:resolveId(w.row.from_place),to_place:resolveId(w.row.to_place)};const added=await insertRow<WorldLink>('world_links',values);idRemap.current.set(String(w.id),added.id);setRows(r=>r?{...r,links:[...r.links,added]}:r);remember(`link:${w.id}`,added);}
   else{await removeRow('world_links',resolveId(w.id));setRows(r=>r?{...r,links:r.links.filter(l=>!sameId(l.id,resolveId(w.id)))}:r);remember(`link:${w.id}`,undefined);}
   return;}
  if(w.type!=='delete-place')return;
  // delete-place: undo re-inserts the place and its links (new ids are fine, links re-point); redo removes them again.
  if(back){
   const added=await insertRow<Place>('world_places',withoutId(w.row));idRemap.current.set(String(w.id),added.id);
   const restored:WorldLink[]=[];
   for(const link of w.links){const values={...withoutId(link),from_place:resolveId(link.from_place),to_place:resolveId(link.to_place)};const addedLink=await insertRow<WorldLink>('world_links',values);idRemap.current.set(String(link.id),addedLink.id);restored.push(addedLink);remember(`link:${link.id}`,addedLink);}
   setRows(r=>r?{...r,places:[...r.places,added],links:[...r.links,...restored]}:r);remember(`place:${w.id}`,added);
  }else{
   for(const link of w.links)await removeRow('world_links',resolveId(link.id));
   await removeRow('world_places',resolveId(w.id));
   setRows(r=>r?{...r,places:r.places.filter(p=>!sameId(p.id,resolveId(w.id))),links:r.links.filter(l=>!sameId(l.id,resolveId(w.id)))}:r);remember(`place:${w.id}`,undefined);
  }
 };
 const undo=()=>{const step=history[history.length-1];if(!step||busy)return;void run(async()=>{await apply(step,'undo');setHistory(h=>h.slice(0,-1));setRedoStack(r=>[...r,step]);},`Undone: ${writeLabel(step)}`);};
 const redo=()=>{const step=redoStack[redoStack.length-1];if(!step||busy)return;void run(async()=>{await apply(step,'redo');setRedoStack(r=>r.slice(0,-1));setHistory(h=>pushStep(h,step));},`Redone: ${writeLabel(step)}`);};
 useEffect(()=>{if(!active)return;const onKey=(e:KeyboardEvent)=>{if(e.key.toLowerCase()!=='z'||(!e.ctrlKey&&!e.metaKey))return;const target=e.target as HTMLElement|null;if(target&&(target.tagName==='INPUT'||target.tagName==='TEXTAREA'||target.tagName==='SELECT'||target.isContentEditable))return;e.preventDefault();if(e.shiftKey)redo();else undo();};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);});
 if(!rows)return <div className="flex h-full items-center justify-center bg-background"><div className="max-w-lg p-6 text-center">{error?<><p role="alert" className="mb-4 text-sm text-destructive">{error}</p><Button variant="outline" onClick={()=>void load()}>Retry WORLD</Button></>:<p className="font-display text-sm">Loading world…</p>}</div></div>;
 const area=rows.areas.find(a=>a.ax===areaKey?.ax&&a.ay===areaKey?.ay)??null;
 const place=rows.places.find(p=>sameId(p.id,placeId))??null;
 const pick=(x:number,y:number,p?:Place)=>{
  if(busy)return;
  if(addKind){void run(async()=>{const added=await insertRow<Place>('world_places',{kind:addKind,name:'',x,y,layer,maze_level:null,npc_key:null,status:'proposed',notes:''});setRows(r=>r?{...r,places:[...r.places,added]}:r);remember(`place:${added.id}`,added);record({type:'insert-place',id:added.id,row:added});setPlaceId(added.id);setAddKind(null);setTab('PLACES');},'Place created');return;}
  if(p){setPlaceId(p.id);if(tab==='LINKS'&&linkPick){setLinkDraft(l=>({...l,[`${linkPick}_place`]:String(p.id)}));setLinkPick(null);}else if(tab==='MEASURE'&&measurePick){setMeasureIds(ids=>[...ids,p.id]);}else setTab('PLACES');return;}
  if(layer===1)return;
  setAreaKey({ax:Math.floor(x/50),ay:Math.floor(y/50)});setTab('AREA');
 };
 const move=(p:Place,x:number,y:number)=>{if(busy)return;setPlaceId(p.id);void run(async()=>{const before=snap<Place>(`place:${p.id}`)??p;const saved=await saveRow('world_places',{x,y},{id:p.id});const after={...before,...saved};changePlace(after);remember(`place:${p.id}`,after);record({type:'update-place',id:p.id,before,after});},'Place position saved');};
 const savePlace=(p:Place)=>void run(async()=>{const before=snap<Place>(`place:${p.id}`)??p;const saved=await saveRow('world_places',withoutId(p),{id:p.id});const after={...p,...saved};changePlace(after);remember(`place:${p.id}`,after);record({type:'update-place',id:p.id,before,after});},'Place saved');
 const deletePlace=(p:Place)=>{if(window.confirm(`Delete ${p.name||'this place'} and its links?`))void run(async()=>{const gone=rows.links.filter(l=>sameId(l.from_place,p.id)||sameId(l.to_place,p.id));for(const l of gone)await removeRow('world_links',l.id);await removeRow('world_places',p.id);setRows(r=>r?{...r,places:r.places.filter(old=>!sameId(old.id,p.id)),links:r.links.filter(l=>!sameId(l.from_place,p.id)&&!sameId(l.to_place,p.id))}:r);remember(`place:${p.id}`,undefined);for(const l of gone)remember(`link:${l.id}`,undefined);record({type:'delete-place',id:p.id,row:snap<Place>(`place:${p.id}`)??p,links:gone});setPlaceId(null);},'Place deleted');};
 const terrainSave=async(t:Terrain,create:boolean)=>{let ok=false;await run(async()=>{const before=snap<Terrain>(`terrain:${t.key}`)??t;const saved=await saveTerrain(t,create);setRows(r=>r?{...r,terrain:create?[...r.terrain,saved]:r.terrain.map(old=>old.key===t.key?saved:old)}:r);remember(`terrain:${t.key}`,saved);record(create?{type:'insert-terrain',key:t.key,row:saved}:{type:'update-terrain',key:t.key,before,after:saved});ok=true;},'Terrain saved');return ok;};
 const saveDayNight=(d:DayNight)=>void run(async()=>{const before=snap<DayNight>('day-night');if(!before)throw new Error('Original day/night settings unavailable.');const saved=await saveRow<WorldRows['settings']>('world_settings',{day_night:d} as WorldRows['settings'],{id:1});const after=saved.day_night??d;setRows(r=>r?{...r,settings:{...r.settings,...saved}}:r);remember('day-night',after);record({type:'update-day-night',before,after});},'Day/night saved');
 const selectPlace=(id:Id)=>{const p=rows.places.find(p=>sameId(p.id,id));if(p){setLayer(placeLayer(p));setPlaceId(id);setAddKind(null);}};
 const openTerrain=(key:string)=>{setTerrainKey(key);setTab('TERRAIN');};
 const deleteLink=(l:WorldLink)=>void run(async()=>{await removeRow('world_links',l.id);setRows(r=>r?{...r,links:r.links.filter(old=>!sameId(old.id,l.id))}:r);remember(`link:${l.id}`,undefined);record({type:'delete-link',id:l.id,row:l});},'Link deleted');
 return <div className="world-workspace flex h-full flex-col bg-background text-foreground">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
   <div><h1 className="font-display text-base">WORLD <span className="ml-2 text-xs text-muted-foreground">{rows.settings.size.toLocaleString()} × {rows.settings.size.toLocaleString()}</span></h1><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{rows.eras.length} eras · {rows.areas.length} areas · {rows.places.length} places</p></div>
   <div className="flex flex-wrap gap-4 text-xs">{[{name:'Maze route',value:route,set:setRoute},{name:'Links',value:links,set:setLinks},{name:'Prime plots',value:primes,set:setPrimes}].map(t=><label key={t.name} className="flex items-center gap-2"><input type="checkbox" checked={t.value} onChange={e=>t.set(e.target.checked)}/>{t.name}</label>)}</div>
  </div>
  <div className="flex min-h-0 flex-1 flex-col md:flex-row">
   <WorldMap layer={layer} onLayer={next=>{setLayer(next);setLayerFilter(String(next));setPlaceId(null);setAddKind(null);}} terrainOverlay={terrainOverlay} onToggleTerrain={()=>setTerrainOverlay(v=>!v)} night={night} onToggleNight={()=>setNight(n=>!n)} rows={rows} selectedPlace={placeId} selectedArea={areaKey} route={route} links={links} primes={primes} addKind={addKind} onPick={pick} onMove={move} locked={locked} onToggleLock={()=>setLocked(v=>!v)} canUndo={history.length>0} canRedo={redoStack.length>0} undoTip={history.length?`Undo: ${writeLabel(history[history.length-1])}`:'Nothing to undo'} redoTip={redoStack.length?`Redo: ${writeLabel(redoStack[redoStack.length-1])}`:'Nothing to redo'} onUndo={undo} onRedo={redo}/>
   <aside className="world-side flex min-h-0 flex-col border-t border-border md:border-l md:border-t-0">
    <nav className="grid shrink-0 grid-cols-6 border-b border-border" aria-label="World panels">{TABS.map(t=><Button key={t} className="rounded-none px-1 text-[10px]" size="sm" variant={tab===t?'secondary':'ghost'} aria-pressed={tab===t} onClick={()=>{setTab(t);setAddKind(null);setLinkPick(null);setMeasurePick(false);}}>{t}</Button>)}</nav>
    {(error||notice||busy)&&<div className="border-b border-border px-3 py-2 text-xs" role={error?'alert':'status'}>{error|| (busy?'Saving…':notice)}</div>}
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
     {tab==='TERRAIN'&&<TerrainPanel rows={rows} selected={terrainKey} onSelect={setTerrainKey} onSave={terrainSave} busy={busy}/>}
     {tab==='ERAS'&&<><DayNightEditor value={rows.settings.day_night} busy={busy} onChange={day_night=>setRows(r=>r?{...r,settings:{...r.settings,day_night}}:r)} onSave={saveDayNight}/><EraEditor onTerrain={openTerrain} rows={rows} busy={busy} onChange={e=>setRows(r=>r?{...r,eras:r.eras.map(old=>sameId(old.id,e.id)?e:old)}:r)} onSave={e=>void run(async()=>{const before=snap<Era>(`era:${e.id}`)??e;const saved=await saveRow('world_eras',withoutId(e),{id:e.id});const after={...e,...saved};setRows(r=>r?{...r,eras:r.eras.map(old=>sameId(old.id,e.id)?after:old)}:r);remember(`era:${e.id}`,after);record({type:'update-era',id:e.id,before,after});},'Era saved')}/></>}
     {tab==='AREA'&&<AreaEditor rows={rows} area={area} busy={busy} onChange={changeArea} onSave={a=>void run(async()=>{const before=snap<Area>(`area:${a.ax},${a.ay}`)??a;const saved=await saveRow('world_areas',a,{ax:a.ax,ay:a.ay});const after={...a,...saved};changeArea(after);remember(`area:${a.ax},${a.ay}`,after);record({type:'update-area',before,after});},'Area saved')} onCreate={()=>{if(area)void run(async()=>{const before=snap<Area>(`area:${area.ax},${area.ay}`)??area;const after=await createAreaDraft(area);changeArea(after);remember(`area:${area.ax},${area.ay}`,after);record({type:'update-area',before,after});},'Area draft created');}} onOpen={()=>{if(area?.draft_name)void run(async()=>{const draft=await findDraft(area.draft_name??'');if(!onOpenDraft(draft))throw new Error('Opening draft cancelled; builder work preserved.');},'Draft opened');}}/>}
     {tab==='PLACES'&&<PlaceEditor layerFilter={layerFilter} onLayerFilter={setLayerFilter} rows={rows} selected={place} kindFilter={kindFilter} eraFilter={eraFilter} onFilter={(k,e)=>{setKindFilter(k);setEraFilter(e);}} onSelect={selectPlace} onChange={changePlace} onSave={savePlace} onDelete={deletePlace} addKind={addKind} onAdd={setAddKind} busy={busy}/>}
     {tab==='LINKS'&&<LinksEditor rows={rows} draft={linkDraft} onChange={setLinkDraft} onCreate={()=>void run(async()=>{const a=rows.places.find(p=>String(p.id)===linkDraft.from_place),b=rows.places.find(p=>String(p.id)===linkDraft.to_place);if(!a||!b)throw new Error('Select both places.');const link=await insertRow<WorldLink>('world_links',{...linkDraft,from_place:a.id,to_place:b.id});setRows(r=>r?{...r,links:[...r.links,link]}:r);remember(`link:${link.id}`,link);record({type:'insert-link',id:link.id,row:link});setLinkDraft(l=>({...l,requirement:'',note:''}));},'Link created')} onDelete={deleteLink} onPick={side=>setLinkPick(linkPick===side?null:side)} picking={linkPick} busy={busy}/>}
     {tab==='MEASURE'&&<MeasureEditor rows={rows} ids={measureIds} onChange={setMeasureIds} onPick={()=>setMeasurePick(!measurePick)} picking={measurePick}/>}
    </div>
   </aside>
  </div>
 </div>;
}
