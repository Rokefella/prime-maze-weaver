import { supabase } from "@/integrations/supabase/client";
import type { ExportedLevel, SavedLevel } from "./types";

export type LevelStatus = "draft" | "ready";

export interface BuilderLevelRow {
  id: string;
  level_number: number | null;
  level_name: string;
  status: LevelStatus;
  grid_size: number;
  data: ExportedLevel;
  updated_at: string;
}

export async function listBuilderLevels(): Promise<SavedLevel[]> {
  const { data, error } = await supabase
    .from("builder_levels")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id as string,
    savedAt: new Date(r.updated_at).getTime(),
    status: (r.status as LevelStatus) ?? "draft",
    data: r.data as ExportedLevel,
  }));
}

export async function upsertBuilderLevel(args: {
  id: string | null;
  data: ExportedLevel;
  status: LevelStatus;
}): Promise<string> {
  const payload = {
    level_number: args.data.levelNumber,
    level_name: args.data.levelName,
    status: args.status,
    grid_size: args.data.gridSize,
    data: args.data as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
  if (args.id) {
    const { data, error } = await supabase
      .from("builder_levels")
      .update(payload)
      .eq("id", args.id)
      .select("id")
      .single();
    if (error) throw error;
    return data!.id as string;
  }
  const { data, error } = await supabase
    .from("builder_levels")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data!.id as string;
}

export async function deleteBuilderLevel(id: string): Promise<void> {
  const { error } = await supabase.from("builder_levels").delete().eq("id", id);
  if (error) throw error;
}

export async function publishLevel(data: ExportedLevel): Promise<void> {
  const payload = {
    level_number: data.levelNumber,
    level_name: data.levelName,
    grid_size: data.gridSize,
    data: data as unknown as Record<string, unknown>,
    published_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("levels")
    .upsert(payload, { onConflict: "level_number" });
  if (error) throw error;
}