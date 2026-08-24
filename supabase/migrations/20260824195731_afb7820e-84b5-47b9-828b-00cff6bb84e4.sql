-- Roles infrastructure
do $$ begin
  create type public.app_role as enum ('admin','rrhh');
exception when duplicate_object then null; end $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_hr_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin','rrhh')
  )
$$;

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Seed existing accounts as admins so the app keeps working
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Replace permissive table policies with role-scoped ones
DROP POLICY IF EXISTS employees_auth_all ON public.employees;
CREATE POLICY employees_staff_all ON public.employees FOR ALL TO authenticated
  USING (public.is_hr_staff(auth.uid())) WITH CHECK (public.is_hr_staff(auth.uid()));

DROP POLICY IF EXISTS incapacities_auth_all ON public.incapacities;
CREATE POLICY incapacities_staff_all ON public.incapacities FOR ALL TO authenticated
  USING (public.is_hr_staff(auth.uid())) WITH CHECK (public.is_hr_staff(auth.uid()));

DROP POLICY IF EXISTS leaves_auth_all ON public.leaves;
CREATE POLICY leaves_staff_all ON public.leaves FOR ALL TO authenticated
  USING (public.is_hr_staff(auth.uid())) WITH CHECK (public.is_hr_staff(auth.uid()));

DROP POLICY IF EXISTS terminations_auth_all ON public.terminations;
CREATE POLICY terminations_staff_all ON public.terminations FOR ALL TO authenticated
  USING (public.is_hr_staff(auth.uid())) WITH CHECK (public.is_hr_staff(auth.uid()));

DROP POLICY IF EXISTS payroll_periods_auth_all ON public.payroll_periods;
CREATE POLICY payroll_periods_staff_all ON public.payroll_periods FOR ALL TO authenticated
  USING (public.is_hr_staff(auth.uid())) WITH CHECK (public.is_hr_staff(auth.uid()));

DROP POLICY IF EXISTS vacation_entitlements_auth_all ON public.vacation_entitlements;
CREATE POLICY vacation_entitlements_staff_all ON public.vacation_entitlements FOR ALL TO authenticated
  USING (public.is_hr_staff(auth.uid())) WITH CHECK (public.is_hr_staff(auth.uid()));

DROP POLICY IF EXISTS companies_auth_all ON public.companies;
CREATE POLICY companies_staff_select ON public.companies FOR SELECT TO authenticated
  USING (public.is_hr_staff(auth.uid()));
CREATE POLICY companies_admin_write ON public.companies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage: restrict private HR buckets to HR staff
DROP POLICY IF EXISTS certificados_auth_all ON storage.objects;
CREATE POLICY certificados_staff_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certificados' AND public.is_hr_staff(auth.uid()))
  WITH CHECK (bucket_id = 'certificados' AND public.is_hr_staff(auth.uid()));

DROP POLICY IF EXISTS documentos_auth_all ON storage.objects;
CREATE POLICY documentos_staff_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documentos' AND public.is_hr_staff(auth.uid()))
  WITH CHECK (bucket_id = 'documentos' AND public.is_hr_staff(auth.uid()));