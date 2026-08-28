CREATE TABLE public.vacations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric NOT NULL DEFAULT 1,
  destination text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacations TO authenticated;
GRANT ALL ON public.vacations TO service_role;

ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY vacations_staff_all ON public.vacations FOR ALL TO authenticated
USING (is_hr_staff(auth.uid())) WITH CHECK (is_hr_staff(auth.uid()));

CREATE TRIGGER vacations_updated BEFORE UPDATE ON public.vacations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX vacations_employee_idx ON public.vacations(employee_id);