import { supabase } from '@/integrations/supabase/client';
import { exportLevel } from '@/lib/maze/storage';
import { buildUlamData } from '@/lib/maze/ulam';
import type { SavedLevel } from '@/lib/maze/types';
import { loadTerrain } from './terrainData';
import type { Area, WorldRows } from './model';
// Existing external tables intentionally use the project's loose table typing.
const table = (name: string) => supabase.from(name as never);
export async function loadWorld(): Promise<WorldRows> {
 const names=['world_settings','world_eras','world_areas','world_places','world_links','drop_types'];
 const results=await Promise.all(names.map(name=> name==='drop_types' ? table(name).select('*').eq('category','sigil') : table(name).select('*')));
 for(let i=0;i<results.length;i++) if(results[i].error) throw new Error(`${names[i]}: ${results[i].error?.message}`);
 const [settings,eras,areas,places,links,sigils]=results.map(r=>r.data??[]) as unknown as [WorldRows['settings'][],WorldRows['eras'],WorldRows['areas'],WorldRows['places'],WorldRows['links'],WorldRows['sigils']];
 const config=settings.find(s=>s.id===1); if(!config) throw new Error('World settings row 1 is missing.');
 return {terrain:await loadTerrain(),settings:config,eras:eras.sort((a,b)=>a.order_index-b.order_index),areas,places,links,sigils};
}
export async function saveRow<T>(name: 'world_eras'|'world_areas'|'world_places'|'world_links'|'world_settings', row: T, keys: Record<string,unknown>): Promise<T> {
 let query=table(name).update(row as never); for(const [key,value] of Object.entries(keys)) query=query.eq(key,value as never);
 const {data,error}=await query.select('*').single(); if(error) throw error; return data as unknown as T;
}
export async function insertRow<T>(name: 'world_places'|'world_links', row: Partial<T>): Promise<T> {
 const {data,error}=await table(name).insert(row as never).select('*').single(); if(error) throw error; return data as unknown as T;
}
export async function removeRow(name:'world_places'|'world_links',id:string|number) {const {error}=await table(name).delete().eq('id',id); if(error) throw error;}
export function blankAreaDraft(ax:number,ay:number) {
 return exportLevel(Array.from({length:2500},()=>({type:'OPEN' as const})),buildUlamData(50),{mode:'village',levelNumber:0,levelName:`world_${ax}_${ay}`,requiredFragments:0,notes:''});
}
export async function createAreaDraft(area:Area):Promise<Area> {
 const data=blankAreaDraft(area.ax,area.ay);
 // Avoid creating duplicate named drafts, including retry after an area-update failure.
 const {data:existing,error:readError}=await supabase.from('builder_levels').select('id').eq('level_name',data.levelName).limit(1); if(readError) throw readError;
 if(!existing?.length){const {error}=await supabase.from('builder_levels').insert({level_name:data.levelName,level_number:0,status:'draft',grid_size:50,data:data as never}); if(error) throw error;}
 return saveRow('world_areas',{...area,draft_name:data.levelName,status:'proposed'},{ax:area.ax,ay:area.ay});
}
export async function findDraft(name:string):Promise<SavedLevel> {
 const {data,error}=await supabase.from('builder_levels').select('*').eq('level_name',name).order('updated_at',{ascending:false}).limit(1).maybeSingle();
 if(error) throw error; if(!data) throw new Error(`No draft named “${name}” exists.`);
 return {id:data.id,savedAt:new Date(data.updated_at).getTime(),status:data.status as SavedLevel['status'],data:data.data as unknown as SavedLevel['data']};
}
