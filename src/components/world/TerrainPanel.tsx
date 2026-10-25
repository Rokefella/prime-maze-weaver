import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Save, ArrowLeft } from 'lucide-react';
import { BUILD_SETS, filterTerrain, MOVES, SIGHTS, snakeKey, TERRAIN_GROUPS, type Terrain } from '@/lib/world/terrain';
import type { WorldRows } from '@/lib/world/model';
import { Choice, Field, Input } from './WorldEditors';
import { TerrainSwatch } from './TerrainSwatch';
const opts=(values:readonly string[])=>values.map(value=>({value,label:value}));
export function TerrainPanel({rows,selected,onSelect,onSave,busy}:{rows:WorldRows;selected:string|null;onSelect:(key:string|null)=>void;onSave:(row:Terrain,create:boolean)=>Promise<boolean>;busy:boolean}) {
 const [group,setGroup]=useState(''),[set,setSet]=useState(''),[era,setEra]=useState(''),[walk,setWalk]=useState(''),[search,setSearch]=useState('');
 const [draft,setDraft]=useState<Terrain|null>(null),[creating,setCreating]=useState(false),[error,setError]=useState('');
 const current=draft??rows.terrain.find(t=>t.key===selected)??null;
 const open=(t:Terrain)=>{setDraft({...t});setCreating(false);setError('');onSelect(t.key);};
 const change=(patch:Partial<Terrain>)=>{if(current)setDraft({...current,...patch});};
 const filtered=filterTerrain(rows.terrain,{group,set,era,walkable:walk,search});
 return <><div className="mb-3 grid grid-cols-4 gap-1 text-center text-[10px]" aria-label="Terrain set counts">{BUILD_SETS.map(s=><div key={s} className="border-b border-border pb-2"><strong className="block text-base tabular-nums">{rows.terrain.filter(t=>t.build_set===s).length}</strong>{s==='later'?'Later':`Set ${s}`}</div>)}</div><p className="mb-3 text-xs text-muted-foreground">{rows.terrain.length} terrain types</p>
 {current?<><Button size="sm" variant="ghost" onClick={()=>{setDraft(null);onSelect(null);setCreating(false);}}><ArrowLeft/> Catalogue</Button><h3 className="my-3 font-display">{creating?'New terrain':current.name}</h3>
 <Field label="Key"><Input value={current.key} disabled={!creating} onChange={key=>change({key:snakeKey(key)})}/></Field>
 <Field label="Name"><Input value={current.name} onChange={name=>change({name})}/></Field>
 <div className="grid grid-cols-2 gap-2"><Field label="Group"><Choice value={current.grp} options={opts(TERRAIN_GROUPS)} onChange={grp=>change({grp:grp as Terrain['grp']})}/></Field><Field label="Build set"><Choice value={current.build_set} options={opts(BUILD_SETS)} onChange={build_set=>change({build_set:build_set as Terrain['build_set']})}/></Field></div>
 {(['sort','steps','sight_delta','light_radius'] as const).map(key=><Field key={key} label={key.replaceAll('_',' ')}><Input type="number" value={current[key]} onChange={v=>change({[key]:v===''&&key==='steps'?null:Number(v)})}/></Field>)}
 <div className="mb-3 flex gap-4">{(['enabled','walkable'] as const).map(key=><label key={key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={current[key]} onChange={e=>change({[key]:e.target.checked})}/>{key}</label>)}</div>
 <Field label="Sight"><Choice value={current.sight} options={opts(SIGHTS)} onChange={sight=>change({sight:sight as Terrain['sight']})}/></Field>
 <Field label="Moves"><Choice value={current.moves} options={opts(MOVES)} onChange={moves=>change({moves})}/></Field>
 <Field label="Colour"><div className="flex gap-2"><input aria-label="Terrain colour picker" type="color" className="world-input w-12" value={current.color||'#808080'} onChange={e=>change({color:e.target.value})}/><Input value={current.color} onChange={color=>change({color:color||null})}/><TerrainSwatch terrain={current} animate/></div></Field>
 <fieldset className="mb-3"><legend className="mb-2 text-xs text-muted-foreground">Eras</legend><div className="grid grid-cols-2 gap-2">{rows.eras.map(e=><label key={e.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={current.eras?.includes(e.name)} onChange={ev=>change({eras:ev.target.checked?[...current.eras,e.name]:current.eras.filter(n=>n!==e.name)})}/>{e.name}</label>)}</div></fieldset>
 {(['walk_note','where_note','exists_as','notes','icon_svg'] as const).map(key=><Field key={key} label={key.replaceAll('_',' ')}><textarea className="world-input min-h-16" value={current[key]??''} onChange={e=>change({[key]:e.target.value||null})}/></Field>)}
 {current.icon_svg&&<img alt={`${current.name} icon`} className="mb-3 h-16 w-16" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(current.icon_svg)}`}/>}
 <Field label="Updated at"><Input value={current.updated_at??''} disabled onChange={()=>{}}/></Field>
 {error&&<p role="alert" className="world-warning">{error}</p>}
 <Button variant="outline" size="sm" disabled={busy} onClick={async()=>{if(!current.name.trim()||!current.key||! /^[a-z][a-z0-9_]*$/.test(current.key)){setError('Enter a name and a snake_case key starting with a letter.');return;}if(creating&&rows.terrain.some(t=>t.key===current.key)){setError('This key already exists.');return;}if(await onSave(current,creating)){setDraft(null);setCreating(false);onSelect(current.key);}}}><Save/> SAVE TERRAIN</Button>
 </>:<><div className="grid grid-cols-2 gap-2"><Field label="Group"><Choice value={group} onChange={setGroup} options={[{value:'',label:'All groups'},...opts(TERRAIN_GROUPS)]}/></Field><Field label="Set"><Choice value={set} onChange={setSet} options={[{value:'',label:'All sets'},...opts(BUILD_SETS)]}/></Field><Field label="Era"><Choice value={era} onChange={setEra} options={[{value:'',label:'All eras'},...rows.eras.map(e=>({value:e.name,label:e.name}))]}/></Field><Field label="Walkable"><Choice value={walk} onChange={setWalk} options={[{value:'',label:'Yes and no'},{value:'yes',label:'Yes'},{value:'no',label:'No'}]}/></Field></div>
 <Field label="Search terrain"><Input value={search} onChange={setSearch}/></Field>
 <Button size="sm" variant="outline" className="mb-3" disabled={busy} onClick={()=>{setCreating(true);setDraft({key:'',name:'',grp:'ground',sort:0,build_set:'later',walkable:true,steps:1,walk_note:null,sight:'open',sight_delta:0,light_radius:0,eras:[],where_note:null,moves:'none',color:null,icon_svg:null,exists_as:null,notes:null,enabled:true});}}><Plus/> ADD TERRAIN</Button>
 <p className="mb-2 text-xs text-muted-foreground">{filtered.length} matches</p>
 {TERRAIN_GROUPS.map(g=>{const items=filtered.filter(t=>t.grp===g);return items.length?<section key={g} className="mb-4"><h3 className="mb-2 border-b border-border pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{g}</h3>{items.map(t=><Button key={t.key} variant="ghost" className="h-auto w-full justify-start gap-2 whitespace-normal rounded-none px-1 py-2 text-left" onClick={()=>open(t)}><TerrainSwatch terrain={t} animate/><span className="min-w-0 flex-1"><span className="block text-xs">{t.name}{!t.enabled?' · disabled':''}</span><span className="text-[10px] text-muted-foreground">{t.walkable?(t.steps??'as grounds'):'no'} steps · {t.sight}</span><span className="mt-1 flex flex-wrap gap-1"><span className="terrain-badge">{t.build_set==='later'?'later':`Set ${t.build_set}`}</span>{t.exists_as&&<span className="terrain-badge">{t.exists_as}</span>}</span></span></Button>)}</section>:null;})}</>}
 </>;
}
