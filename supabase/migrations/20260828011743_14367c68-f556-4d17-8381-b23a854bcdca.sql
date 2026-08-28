ALTER TABLE public.employees
  ADD COLUMN contract_type text NOT NULL DEFAULT 'fijo';

UPDATE public.employees
SET contract_type = CASE WHEN contract_end_date IS NULL THEN 'indefinido' ELSE 'fijo' END;