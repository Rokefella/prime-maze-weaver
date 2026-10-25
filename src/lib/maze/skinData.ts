import { supabase } from '@/integrations/supabase/client';
import type { MazeSkin,LevelSkin } from './skins';
const table=(name:string)=>supabase.from(name as never);
export async function loadMazeSkins():Promise<MazeSkin[]> {
 const {data,error}=await table('maze_skins').select('*').order('era_order');if(error)throw error;return (data??[]) as unknown as MazeSkin[];
}
export async function loadLevelSkin(level:number):Promise<LevelSkin|null> {
 const {data,error}=await table('maze_level_skins').select('*').eq('level_number',level).maybeSingle();if(error)throw error;return data as unknown as LevelSkin|null;
}
export async function saveMazeSkin(skin:MazeSkin):Promise<MazeSkin> {
 const {data,error}=await table('maze_skins').update(skin as never).eq('era_order',skin.era_order).select('*').single();if(error)throw error;if(typeof window!=='undefined')window.dispatchEvent(new Event('praem-maze-skins-changed'));return data as unknown as MazeSkin;
}