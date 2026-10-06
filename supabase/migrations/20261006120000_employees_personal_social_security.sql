-- Datos personales ampliados, contactos de emergencia, cuenta de nómina y seguridad social.
alter table public.employees
  add column if not exists id_issue_place text,
  add column if not exists address text,
  add column if not exists contact1_name text,
  add column if not exists contact1_relationship text,
  add column if not exists contact1_phone text,
  add column if not exists contact2_name text,
  add column if not exists contact2_relationship text,
  add column if not exists contact2_phone text,
  add column if not exists bank_name text,
  add column if not exists bank_account_type text,
  add column if not exists bank_account_number text,
  add column if not exists eps text,
  add column if not exists pension_fund text,
  add column if not exists severance_fund text,
  add column if not exists arl text,
  add column if not exists compensation_fund text;
