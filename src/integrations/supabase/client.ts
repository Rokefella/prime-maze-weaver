// Hardcoded connection to the external Supabase project (jngofylkynipsnzyyzdq).
// Do NOT replace with env-variable lookups — Lovable Cloud must not overwrite this.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const SUPABASE_URL = 'https://jngofylkynipsnzyyzdq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_VlI-wgKZYSCs1Xzv1wuA9Q_X8prD_uZ';

function createSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

