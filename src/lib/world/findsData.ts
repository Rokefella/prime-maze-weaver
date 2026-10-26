import { supabase } from '@/integrations/supabase/client';
import type { FindDrop, WorldFind } from './finds';

// Read-only boundary: use the authoritative shared client, not the workspace database.
export async function loadFinds():Promise<WorldFind[]> {
 const {data,error}=await supabase.from('world_finds' as never).select('*').eq('enabled',true).order('find_key');
 if(error)throw new Error(`Finds: ${error.message}`);
 return (data??[]) as unknown as WorldFind[];
}
export async function loadFindDrops():Promise<FindDrop[]> {
 const {data,error}=await supabase.from('drop_types' as never).select('drop_key,name');
 if(error)throw new Error(`Find names: ${error.message}`);
 return (data??[]) as unknown as FindDrop[];
}