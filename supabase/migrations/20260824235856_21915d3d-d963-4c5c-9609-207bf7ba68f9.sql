ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS islero_logo_path text,
  ADD COLUMN IF NOT EXISTS islero_logo_name text;