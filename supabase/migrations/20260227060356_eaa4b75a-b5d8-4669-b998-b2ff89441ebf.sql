
-- Fix pessoas RLS: drop restrictive policy, create permissive one
DROP POLICY IF EXISTS "Authenticated users can do everything with pessoas" ON public.pessoas;
CREATE POLICY "Authenticated users can do everything with pessoas"
  ON public.pessoas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fix discipulado RLS: drop restrictive policy, create permissive one
DROP POLICY IF EXISTS "Authenticated users can do everything with discipulado" ON public.discipulado;
CREATE POLICY "Authenticated users can do everything with discipulado"
  ON public.discipulado
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
