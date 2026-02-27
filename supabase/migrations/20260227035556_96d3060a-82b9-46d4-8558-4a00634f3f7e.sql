ALTER TABLE public.discipulado 
  ALTER COLUMN discipulador_id DROP NOT NULL,
  ADD COLUMN discipulador text;