ALTER TABLE public.visitors 
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS admin_region text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT NULL;