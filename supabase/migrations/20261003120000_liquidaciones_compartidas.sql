CREATE TABLE public.shared_liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  employee_id uuid NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name text NOT NULL,
  data jsonb NOT NULL,
  logo_path text NULL,
  firma text NULL,
  signed_at timestamptz NULL,
  created_by uuid NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_liquidaciones TO authenticated;
GRANT ALL ON public.shared_liquidaciones TO service_role;
ALTER TABLE public.shared_liquidaciones ENABLE ROW LEVEL SECURITY;
-- Sin políticas para anon: el acceso público pasa solo por funciones de servidor (service role).
CREATE POLICY shared_liquidaciones_staff_all ON public.shared_liquidaciones FOR ALL TO authenticated
  USING (public.is_hr_staff(auth.uid())) WITH CHECK (public.is_hr_staff(auth.uid()));
