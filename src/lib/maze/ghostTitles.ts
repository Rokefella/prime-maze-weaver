import { supabase } from "@/integrations/supabase/client";
import { existingGhostTitle, GHOST_TITLE_MAX } from "./spawnGhost";

// This shared table is not yet included in the generated database types.
export async function listGhostTitles(): Promise<string[]> {
  const { data, error } = await supabase.from("titles" as never).select("name").order("name");
  if (error) throw error;
  return ((data ?? []) as unknown as { name: string }[]).map((row) => row.name);
}

export async function addGhostTitle(value: string): Promise<{ names: string[]; selected: string } | null> {
  const name = value.trim().slice(0, GHOST_TITLE_MAX);
  if (!name) return null;
  const names = await listGhostTitles();
  const existing = existingGhostTitle(names, name);
  if (existing) return { names, selected: existing };
  const { error } = await supabase.from("titles" as never).insert({ name } as never);
  const refreshed = await listGhostTitles();
  const selected = existingGhostTitle(refreshed, name);
  if (error && !selected) throw error;
  return { names: refreshed, selected: selected ?? name };
}