import { placeFacts, placeLayer } from '@/lib/world/layers';
import { TerrainSwatch } from './TerrainSwatch';
import { MazeSkinEditor } from './MazeSkinEditor';
import type { MazeSkin } from '@/lib/maze/skins';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Trash2, Plus, ExternalLink } from 'lucide-react';
import { eraAt, isPrime, LINK_KINDS, mazeRoute, measureLeg, PLACE_KINDS, plotNumber, ringWarnings, sameId, type Area, type Era, type Id, type Place, type WorldLink, type WorldRows } from '@/lib/world/model';

export function Field({label,children}:{label:string;children:ReactNode}) {return <label className="world-field"><span>{label}</span>{children}</label>;}
export const Input = ({value,onChange,type='text',...rest}:{value:string|number|null;onChange:(v:string)=>void;type?:string;min?:number;max?:number;step?:string;disabled?:boolean})=><input className="world-input" type={type} value={value??''} onChange={e=>onChange(e.target.value)} {...rest}/>;
export function Choice({value,onChange,options}:{value:string|number|null;onChange:(v:string)=>void;options:{value:string;label:string}[]}) {return <select className="world-input" value={value??''} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>;}
const words=(s:string)=>s.replaceAll('_',' ');
const options=(items:readonly string[])=>items.map(value=>({value,label:words(value)}));
const nullableNumber=(v:string)=>v===''?null:Number(v);
const notes=(value:string|null,onChange:(v:string)=>void)=><textarea className="world-input min-h-20" value={value??''} onChange={e=>onChange(e.target.value)}/>;
export function EraEditor({rows,onChange,onSave,busy,onTerrain,skins,onSkinChange,onSkinSave}:{skins:MazeSkin[];onSkinChange:(s:MazeSkin)=>void;onSkinSave:(s:MazeSkin)=>void;onTerrain:(key:string)=>void;rows:WorldRows;onChange:(e:Era)=>void;onSave:(e:Era)=>void;busy:boolean}) {
 const warnings=ringWarnings(rows.eras);
 return <>{warnings.length>0&&<p className="world-warning" role="status">{warnings.join(' · ')}</p>}{rows.eras.map(e=>{const sigil=rows.sigils.find(s=>s.drop_key===e.sigil_key);return <article className="mb-3 rounded border border-border bg-card/30 p-3" key={e.id}>
  <div className="mb-3 flex items-center gap-3">{sigil?.icon_svg&&<img className="h-8 w-8" alt={e.sigil_key??'Sigil'} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sigil.icon_svg)}`}/>}<span className="text-xs text-muted-foreground">{String(e.order_index).padStart(2,'0')}</span><h3 className="font-display text-sm">{e.name}</h3></div>
  <Field label="Name"><Input value={e.name} onChange={name=>onChange({...e,name})}/></Field>
  <Field label="Sigil"><Choice value={e.sigil_key} onChange={sigil_key=>onChange({...e,sigil_key:sigil_key||null})} options={[{value:'',label:'No sigil'},...rows.sigils.map(s=>({value:s.drop_key,label:s.name||s.drop_key}))]}/></Field>
  <div className="grid grid-cols-2 gap-2"><Field label="Ring from"><Input type="number" min={0} max={500} value={e.ring_from} onChange={v=>onChange({...e,ring_from:Number(v)})}/></Field><Field label="Ring to"><Input type="number" min={0} max={500} value={e.ring_to} onChange={v=>onChange({...e,ring_to:Number(v)})}/></Field></div>
  <Field label="Biome"><Input value={e.biome} onChange={biome=>onChange({...e,biome})}/></Field>
  <Field label="Palette"><Input type="color" value={e.palette} onChange={palette=>onChange({...e,palette})}/></Field>
  <div className="grid grid-cols-2 gap-2"><Field label="Step cost"><Input type="number" min={0} step="0.1" value={e.step_cost} onChange={v=>onChange({...e,step_cost:Number(v)})}/></Field><Field label="Darkness"><Input type="number" min={0} step="1" value={e.darkness} onChange={v=>onChange({...e,darkness:Number(v)})}/></Field></div>
  <Field label="Description">{notes(e.description,description=>onChange({...e,description}))}</Field>
  <Button variant="outline" size="sm" disabled={busy} onClick={()=>onSave(e)}><Save/> Save era</Button>
  <div className="mt-3 flex flex-wrap gap-1" aria-label={`${e.name} terrain types`}>{rows.terrain.filter(t=>t.enabled&&t.eras?.includes(e.name)).sort((a,b)=>a.sort-b.sort).map(t=><Button key={t.key} size="sm" variant="ghost" className="h-auto gap-1 px-1 py-1 text-[9px]" onClick={()=>onTerrain(t.key)} title={t.name}><TerrainSwatch terrain={t} size={12}/>{t.name}</Button>)}</div>
 {skins.filter(s=>s.era_order===e.order_index).map(s=><MazeSkinEditor key={s.era_order} skin={s} terrain={rows.terrain} onChange={onSkinChange} onSave={onSkinSave} busy={busy}/>)}
 </article>;})}</>;
}
export function AreaEditor({area,rows,onChange,onSave,onOpen,onCreate,busy}:{area:Area|null;rows:WorldRows;onChange:(a:Area)=>void;onSave:(a:Area)=>void;onOpen:()=>void;onCreate:()=>void;busy:boolean}) {
 if(!area)return <p className="text-sm text-muted-foreground">No area selected</p>;
 const derived=eraAt(rows.eras,area.ax*50+24.5,area.ay*50+24.5);
 return <><h3 className="mb-4 font-display text-lg">Area {area.ax},{area.ay}</h3><dl className="world-facts"><dt>Cells</dt><dd>{area.ax*50}–{area.ax*50+49}, {area.ay*50}–{area.ay*50+49}</dd><dt>Centre era</dt><dd>{derived?.name??'No era'}</dd></dl>
 <Field label="Era override"><Choice value={area.era_id} onChange={v=>onChange({...area,era_id:rows.eras.find(e=>String(e.id)===v)?.id??null})} options={[{value:'',label:`Derived · ${derived?.name??'No era'}`},...rows.eras.map(e=>({value:String(e.id),label:e.name}))]}/></Field>
 <Field label="Status"><Choice value={area.status} onChange={status=>onChange({...area,status})} options={options(['empty','proposed','generated','edited','final'])}/></Field>
 <Field label="Draft name"><Input value={area.draft_name} onChange={draft_name=>onChange({...area,draft_name})}/></Field>
 <Field label="Notes">{notes(area.notes,n=>onChange({...area,notes:n}))}</Field>
 <Button size="sm" variant="outline" disabled={busy} onClick={()=>onSave(area)}><Save/> Save area</Button>
 <div className="mt-5 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy||!area.draft_name} onClick={onOpen}><ExternalLink/> OPEN IN BUILDER</Button><Button size="sm" variant="outline" disabled={busy} onClick={onCreate}><Plus/> CREATE DRAFT</Button></div></>;
}
export function PlaceEditor({layerFilter,onLayerFilter,rows,selected,kindFilter,eraFilter,onFilter,onSelect,onChange,onSave,onDelete,addKind,onAdd,busy}:{layerFilter:string;onLayerFilter:(v:string)=>void;rows:WorldRows;selected:Place|null;kindFilter:string;eraFilter:string;onFilter:(kind:string,era:string)=>void;onSelect:(id:Id)=>void;onChange:(p:Place)=>void;onSave:(p:Place)=>void;onDelete:(p:Place)=>void;addKind:string|null;onAdd:(kind:string|null)=>void;busy:boolean}) {
 const facts=selected?placeFacts(selected):null;
 const filtered=rows.places.filter(p=>{const point=placeFacts(p);return (!layerFilter||String(placeLayer(p))===layerFilter)&&(!kindFilter||p.kind===kindFilter)&&(!eraFilter||String(eraAt(rows.eras,point.x,point.y)?.id)===eraFilter);});
 return <><Field label="Layer filter"><Choice value={layerFilter} onChange={onLayerFilter} options={[{value:'',label:'All layers'},{value:'0',label:'Surface · 0'},{value:'1',label:'Underground · 1'}]}/></Field><div className="grid grid-cols-2 gap-2"><Field label="Kind filter"><Choice value={kindFilter} onChange={v=>onFilter(v,eraFilter)} options={[{value:'',label:'All kinds'},...options(PLACE_KINDS)]}/></Field><Field label="Era filter"><Choice value={eraFilter} onChange={v=>onFilter(kindFilter,v)} options={[{value:'',label:'All eras'},...rows.eras.map(e=>({value:String(e.id),label:e.name}))]}/></Field></div>
 <div className="mb-4 flex items-end gap-2"><Field label="New place kind"><Choice value={addKind??'town'} onChange={v=>onAdd(v)} options={options(PLACE_KINDS)}/></Field><Button className="mb-3" size="sm" variant={addKind?'secondary':'outline'} onClick={()=>onAdd(addKind?null:'town')} disabled={busy}><Plus/>{addKind?'Cancel':'ADD PLACE'}</Button></div>
 {addKind&&<p className="world-warning">Adding {words(addKind)}</p>}
 <div className="mb-5 max-h-64 overflow-y-auto border-y border-border">{filtered.map(p=><Button key={p.id} className="h-auto min-h-9 w-full justify-between whitespace-normal rounded-none py-2 text-left" size="sm" variant={sameId(p.id,selected?.id)?'secondary':'ghost'} onClick={()=>onSelect(p.id)}><span>{p.name||words(p.kind)}</span><span className="ml-2 text-[10px] text-muted-foreground">{p.maze_level??words(p.kind)}</span></Button>)}</div>
 {selected&&<><h3 className="mb-3 font-display text-base">{selected.name||'Place'}</h3><Field label="Kind"><Choice value={selected.kind} onChange={kind=>onChange({...selected,kind})} options={options(PLACE_KINDS)}/></Field><Field label="Name"><Input value={selected.name} onChange={name=>onChange({...selected,name})}/></Field><Field label="Maze level"><Input type="number" value={selected.maze_level} onChange={v=>onChange({...selected,maze_level:nullableNumber(v)})}/></Field><Field label="NPC key"><Input value={selected.npc_key} onChange={npc_key=>onChange({...selected,npc_key:npc_key||null})}/></Field><Field label="Status"><Choice value={selected.status} onChange={status=>onChange({...selected,status})} options={options(['proposed','confirmed'])}/></Field><Field label="Notes">{notes(selected.notes,n=>onChange({...selected,notes:n}))}</Field>
 <dl className="world-facts"><dt>Layer</dt><dd>{placeLayer(selected)} · {placeLayer(selected)===1?'Underground':'Surface'}</dd><dt>Action</dt><dd>{selected.action||'None'}</dd><dt>Target</dt><dd>{selected.target_layer!=null&&selected.target_x!=null&&selected.target_y!=null?`Layer ${selected.target_layer} · ${selected.target_x},${selected.target_y}`:'None'}</dd><dt>Cell</dt><dd>{selected.x},{selected.y}</dd><dt>Area</dt><dd>{facts?.ax},{facts?.ay}</dd><dt>Era</dt><dd>{facts?eraAt(rows.eras,facts.x,facts.y)?.name??'No era':'No era'}</dd><dt>Plot number</dt><dd>{facts?plotNumber(facts.px,facts.py):''}</dd><dt>Prime</dt><dd>{facts&&isPrime(plotNumber(facts.px,facts.py))?'Yes':'No'}</dd></dl>
 <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>onSave(selected)}><Save/> Save place</Button><Button size="icon" variant="ghost" title="Delete place" aria-label="Delete place" disabled={busy} onClick={()=>onDelete(selected)}><Trash2/></Button></div></>}
 </>;
}
export interface LinkDraft { from_place:string;to_place:string;kind:string;requirement:string;note:string }
export function LinksEditor({rows,draft,onChange,onCreate,onDelete,onPick,picking,busy}:{rows:WorldRows;draft:LinkDraft;onChange:(l:LinkDraft)=>void;onCreate:()=>void;onDelete:(l:WorldLink)=>void;onPick:(side:'from'|'to')=>void;picking:'from'|'to'|null;busy:boolean}) {
 const places=[{value:'',label:'Select place'},...rows.places.map(p=>({value:String(p.id),label:p.name||`${p.kind} ${p.x},${p.y}`}))];
 return <>{(['from','to'] as const).map(side=><div key={side} className="flex items-end gap-2"><Field label={`${side} place`}><Choice value={draft[`${side}_place`]} onChange={v=>onChange({...draft,[`${side}_place`]:v})} options={places}/></Field><Button size="sm" className="mb-3" variant={picking===side?'secondary':'outline'} onClick={()=>onPick(side)}>Pick on map</Button></div>)}
 <Field label="Kind"><Choice value={draft.kind} onChange={kind=>onChange({...draft,kind})} options={options(LINK_KINDS)}/></Field><Field label="Requirement"><Input value={draft.requirement} onChange={requirement=>onChange({...draft,requirement})}/></Field><Field label="Note">{notes(draft.note,note=>onChange({...draft,note}))}</Field>
 <Button size="sm" variant="outline" disabled={busy||!draft.from_place||!draft.to_place||draft.from_place===draft.to_place} onClick={onCreate}><Plus/> Add link</Button>
 <div className="mt-5">{rows.links.map(l=><div key={l.id} className="flex items-center justify-between gap-2 border-t border-border py-3"><div className="min-w-0 text-xs"><p>{rows.places.find(p=>sameId(p.id,l.from_place))?.name??'Unknown'} → {rows.places.find(p=>sameId(p.id,l.to_place))?.name??'Unknown'}</p><p className="mt-1 text-muted-foreground">{l.kind}{l.requirement?` · ${l.requirement}`:''}</p>{l.note&&<p className="mt-1 text-muted-foreground">{l.note}</p>}</div><Button size="icon" variant="ghost" title="Delete link" aria-label="Delete link" disabled={busy} onClick={()=>onDelete(l)}><Trash2/></Button></div>)}</div>
 </>;
}
export function MeasureEditor({rows,ids,onChange,onPick,picking}:{rows:WorldRows;ids:Id[];onChange:(ids:Id[])=>void;onPick:()=>void;picking:boolean}) {
 const places=ids.flatMap(id=>{const p=rows.places.find(p=>sameId(p.id,id));return p?[p]:[];});
 const legs=places.slice(1).map((p,i)=>({a:places[i],b:p,...measureLeg(places[i],p,rows.eras)}));
 return <><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>onChange(mazeRoute(rows.places).filter(p=>(p.maze_level??0)>=1&&(p.maze_level??0)<=30).map(p=>p.id))}>MAZE ROUTE</Button><Button size="sm" variant={picking?'secondary':'outline'} onClick={onPick}>Pick on map</Button><Button size="sm" variant="ghost" onClick={()=>onChange([])}>Clear</Button></div>
 <Field label="Add next place"><Choice value="" onChange={v=>{const p=rows.places.find(p=>String(p.id)===v);if(p)onChange([...ids,p.id]);}} options={[{value:'',label:'Select place'},...rows.places.map(p=>({value:String(p.id),label:p.name||p.kind}))]}/></Field>
 <ol className="mb-4">{places.map((p,i)=><li key={`${p.id}-${i}`} className="flex items-center justify-between border-b border-border py-2 text-xs"><span>{i+1}. {p.name||p.kind}</span><Button size="icon" variant="ghost" aria-label={`Remove stop ${i+1}`} title="Remove stop" onClick={()=>onChange(ids.filter((_,n)=>n!==i))}><Trash2/></Button></li>)}</ol>
 {legs.length>0&&<><table className="w-full text-xs"><thead><tr className="text-left text-muted-foreground"><th className="pb-2">Leg</th><th>Cells</th><th>Est. steps</th></tr></thead><tbody>{legs.map((l,i)=><tr key={i} className="border-t border-border"><td className="max-w-36 py-3 pr-2">{l.a.name} → {l.b.name}</td><td>{l.distance.toLocaleString()}</td><td>{Math.round(l.steps).toLocaleString()}</td></tr>)}</tbody></table><dl className="world-facts mt-5" aria-label="Measurement totals"><dt>Total cells</dt><dd>{legs.reduce((n,l)=>n+l.distance,0).toLocaleString()}</dd><dt>Total estimated steps</dt><dd>{Math.round(legs.reduce((n,l)=>n+l.steps,0)).toLocaleString()}</dd></dl></>}
 </>;
}
