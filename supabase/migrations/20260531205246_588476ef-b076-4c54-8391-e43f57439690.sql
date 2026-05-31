CREATE TABLE public.builder_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number int,
  level_name text NOT NULL DEFAULT 'Untitled',
  status text NOT NULL DEFAULT 'draft',
  grid_size int NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.levels (
  level_number int PRIMARY KEY,
  level_name text NOT NULL,
  grid_size int NOT NULL,
  data jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.builder_levels TO anon, authenticated;
GRANT ALL ON public.builder_levels TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.levels TO anon, authenticated;
GRANT ALL ON public.levels TO service_role;

ALTER TABLE public.builder_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read builder_levels" ON public.builder_levels FOR SELECT USING (true);
CREATE POLICY "Public insert builder_levels" ON public.builder_levels FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update builder_levels" ON public.builder_levels FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete builder_levels" ON public.builder_levels FOR DELETE USING (true);

CREATE POLICY "Public read levels" ON public.levels FOR SELECT USING (true);
CREATE POLICY "Public insert levels" ON public.levels FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update levels" ON public.levels FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete levels" ON public.levels FOR DELETE USING (true);