CREATE TABLE public.holidays (
  date date PRIMARY KEY,
  name text NOT NULL,
  year integer NOT NULL,
  source text NOT NULL DEFAULT 'api',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY holidays_staff_all ON public.holidays FOR ALL TO authenticated
  USING (public.is_hr_staff(auth.uid())) WITH CHECK (public.is_hr_staff(auth.uid()));