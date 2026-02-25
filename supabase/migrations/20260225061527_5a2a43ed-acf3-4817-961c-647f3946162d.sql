
-- 1. Criar tabela pessoas
CREATE TABLE public.pessoas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  telefone text,
  birth_date date,
  gender text,
  admin_region text,
  observations text,
  status text DEFAULT 'ativo',
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

-- 3. Política RLS (mesma lógica do discipleship atual)
CREATE POLICY "Authenticated users can do everything with pessoas"
  ON public.pessoas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Trigger updated_at
CREATE TRIGGER update_pessoas_updated_at
  BEFORE UPDATE ON public.pessoas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Migrar pessoas a partir dos dados existentes do discipleship
-- Primeiro inserir todos os discípulos (que têm dados pessoais)
INSERT INTO public.pessoas (nome, telefone, birth_date, gender, admin_region, observations, status, created_by, created_at)
SELECT DISTINCT ON (d.disciple_name)
  d.disciple_name,
  d.disciple_phone,
  d.birth_date,
  d.gender,
  d.admin_region,
  d.observations,
  d.status,
  d.created_by,
  d.created_at
FROM public.discipleship d
WHERE d.disciple_name IS NOT NULL AND d.disciple_name != ''
ORDER BY d.disciple_name, d.updated_at DESC NULLS LAST;

-- Depois inserir discipuladores que não apareceram como discípulos
INSERT INTO public.pessoas (nome, created_by, created_at)
SELECT DISTINCT ON (d.discipler_name)
  d.discipler_name,
  d.created_by,
  d.created_at
FROM public.discipleship d
WHERE d.discipler_name IS NOT NULL 
  AND d.discipler_name != ''
  AND NOT EXISTS (SELECT 1 FROM public.pessoas p WHERE p.nome = d.discipler_name)
ORDER BY d.discipler_name, d.created_at ASC;

-- 6. Criar nova tabela de discipulado com FKs
CREATE TABLE public.discipulado (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discipulador_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  discipulo_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  status text DEFAULT 'ativo',
  observations text,
  start_date date,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(discipulador_id, discipulo_id)
);

ALTER TABLE public.discipulado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can do everything with discipulado"
  ON public.discipulado FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_discipulado_updated_at
  BEFORE UPDATE ON public.discipulado
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Migrar relacionamentos para a nova tabela
INSERT INTO public.discipulado (discipulador_id, discipulo_id, status, observations, start_date, created_by, created_at)
SELECT 
  p_leader.id,
  p_disciple.id,
  d.status,
  d.observations,
  d.start_date,
  d.created_by,
  d.created_at
FROM public.discipleship d
JOIN public.pessoas p_leader ON p_leader.nome = d.discipler_name
JOIN public.pessoas p_disciple ON p_disciple.nome = d.disciple_name
WHERE d.discipler_name != d.disciple_name;

-- 8. Remover tabela antiga
DROP TABLE public.discipleship;
