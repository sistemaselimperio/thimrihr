-- Columna NIT de empresas (existía en Lovable Cloud pero faltaba en el repo).
alter table public.companies add column if not exists nit text;
