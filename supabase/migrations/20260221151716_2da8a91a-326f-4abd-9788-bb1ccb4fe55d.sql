-- Add gender column to discipleship table
ALTER TABLE public.discipleship ADD COLUMN gender text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.discipleship.gender IS 'M for male, F for female';