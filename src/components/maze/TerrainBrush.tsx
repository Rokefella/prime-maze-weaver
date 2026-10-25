import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { filterTerrain, TERRAIN_GROUPS, type Terrain } from '@/lib/world/terrain';
import { TerrainSwatch } from '../world/TerrainSwatch';
export function TerrainBrush({rows,era,selected,onSelect,error}:{rows:Terrain[];era:string|null;selected:string|null;onSelect:(t:Terrain)=>void;error:string}) {
 const [all,setAll]=useState(false),[search,setSearch]=useState('');
 const filtered=filterTerrain(rows,{enabledOnly:true,era:all?'':era??'',search});
 return <div><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">{era??'All eras'}</span><label className="flex items-center gap-2 text-[10px]"><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/> SHOW ALL</label></div><input aria-label="Search terrain brush" placeholder="Search terrain" className="world-input mb-2" value={search} onChange={e=>setSearch(e.target.value)}/>{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}<div className="max-h-72 overflow-y-auto">{TERRAIN_GROUPS.map(g=>{const items=filtered.filter(t=>t.grp===g);return items.length?<section key={g}><h4 className="my-2 text-[10px] uppercase tracking-widest text-muted-foreground">{g}</h4>{items.map(t=><Button key={t.key} size="sm" variant={selected===t.key?'secondary':'ghost'} aria-pressed={selected===t.key} className="h-auto min-h-9 w-full justify-start gap-2 whitespace-normal text-left text-xs" onClick={()=>onSelect(t)}><TerrainSwatch terrain={t} size={18}/><span>{t.name}</span></Button>)}</section>:null;})}{!filtered.length&&!error&&<p className="text-xs text-muted-foreground">No terrain matches</p>}</div></div>;
}
