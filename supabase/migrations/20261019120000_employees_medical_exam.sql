-- Exámenes médicos ocupacionales: indicador y fecha del último examen.
alter table public.employees
  add column if not exists has_medical_exam boolean not null default false,
  add column if not exists medical_exam_date date;
