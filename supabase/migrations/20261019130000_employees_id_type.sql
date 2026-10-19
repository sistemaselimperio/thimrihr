-- Tipo de documento de identidad: cédula de ciudadanía (cc) o Permiso por Protección Temporal (ppt).
alter table public.employees
  add column if not exists id_type text not null default 'cc';
