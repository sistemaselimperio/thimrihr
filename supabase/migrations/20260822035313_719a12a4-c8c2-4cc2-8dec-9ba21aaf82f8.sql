CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_auth_all" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.companies (name) VALUES
  ('Fabian Páez'),
  ('Sandra Páez'),
  ('Transportes El Imperio SAS'),
  ('Plantuladora El Imperio'),
  ('Comercializadora El Imperio 1 SAS');

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  cedula text NOT NULL UNIQUE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  position text NOT NULL DEFAULT '',
  hire_date date NOT NULL,
  contract_end_date date,
  exit_date date,
  phone text,
  work_location text,
  work_schedule text DEFAULT '6:00am - 4:00pm',
  status text NOT NULL DEFAULT 'activo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_auth_all" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX employees_status_idx ON public.employees (status);
CREATE INDEX employees_company_idx ON public.employees (company_id);

CREATE TABLE public.incapacities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  start_date date NOT NULL,
  end_date date NOT NULL,
  certificate_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incapacities TO authenticated;
GRANT ALL ON public.incapacities TO service_role;
ALTER TABLE public.incapacities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incapacities_auth_all" ON public.incapacities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX incapacities_employee_idx ON public.incapacities (employee_id);

CREATE TABLE public.leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'sin_pago',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric(5,1) NOT NULL DEFAULT 1,
  reason text NOT NULL DEFAULT '',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaves TO authenticated;
GRANT ALL ON public.leaves TO service_role;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaves_auth_all" ON public.leaves FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX leaves_employee_idx ON public.leaves (employee_id);

CREATE TABLE public.terminations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'vencimiento',
  exit_date date NOT NULL,
  reason text,
  settlement_paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terminations TO authenticated;
GRANT ALL ON public.terminations TO service_role;
ALTER TABLE public.terminations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "terminations_auth_all" ON public.terminations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX terminations_employee_idx ON public.terminations (employee_id);

CREATE TABLE public.vacation_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year integer NOT NULL,
  entitled_days numeric(5,1) NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacation_entitlements TO authenticated;
GRANT ALL ON public.vacation_entitlements TO service_role;
ALTER TABLE public.vacation_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vacation_entitlements_auth_all" ON public.vacation_entitlements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  base_days numeric(5,1) NOT NULL DEFAULT 15,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_periods TO authenticated;
GRANT ALL ON public.payroll_periods TO service_role;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_periods_auth_all" ON public.payroll_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;
GRANT ALL ON public.document_templates TO service_role;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_templates_auth_all" ON public.document_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.document_templates (name, category, description) VALUES
  ('Contrato de trabajo', 'contrato', 'Varía por empresa y cargo'),
  ('Memorando de llamado de atención', 'disciplinario', NULL),
  ('Citación a descargos', 'disciplinario', NULL),
  ('Audiencia de descargos', 'disciplinario', NULL),
  ('Carta de renuncia', 'retiro', NULL),
  ('Preaviso de terminación', 'retiro', NULL),
  ('Liquidación', 'retiro', NULL),
  ('Paz y salvo', 'retiro', 'Incluye checklist de entrega'),
  ('Permiso (genérico)', 'novedad', NULL),
  ('Formato de retiro', 'retiro', NULL);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER employees_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER incapacities_updated BEFORE UPDATE ON public.incapacities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER leaves_updated BEFORE UPDATE ON public.leaves FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER terminations_updated BEFORE UPDATE ON public.terminations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payroll_periods_updated BEFORE UPDATE ON public.payroll_periods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER document_templates_updated BEFORE UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
