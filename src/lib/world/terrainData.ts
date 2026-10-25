import { supabase } from '@/integrations/supabase/client';
import type { Terrain } from './terrain';
const table=(name:string)=>supabase.from(name as never);
export async function loadTerrain():Promise<Terrain[]> {const {data,error}=await table('world_terrain_types').select('*').order('sort');if(error)throw error;return (data??[]) as unknown as Terrain[];}
export async function areaTerrainEra(name:string):Promise<string|null> {
 const match=/^world_(-?\d+)_(-?\d+)$/.exec(name);if(!match)return null;
 const {data,error}=await table('world_areas').select('era_id').eq('ax',Number(match[1])).eq('ay',Number(match[2])).maybeSingle();if(error)throw error;
 const area=data as {era_id?:string|number}|null;if(area?.era_id==null)return null;
 const era=await table('world_eras').select('name').eq('id',area.era_id).maybeSingle();if(era.error)throw era.error;return (era.data as {name?:string}|null)?.name??null;
}
export async function saveTerrain(row:Terrain,create=false):Promise<Terrain> {
 const {updated_at,...values}=row;
 const query=create?table('world_terrain_types').insert(values as never):table('world_terrain_types').update({...values,updated_at:new Date().toISOString()} as never).eq('key',row.key);
 const {data,error}=await query.select('*').single();if(error)throw error;return data as unknown as Terrain;
}
