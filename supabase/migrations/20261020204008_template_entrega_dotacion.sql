-- Plantilla base para el documento especial "Entrega de dotación" (SGSST-F-001).
INSERT INTO public.document_templates (name, category, description)
SELECT 'Entrega de dotación', 'dotacion', 'Formato SG-SST de entrega de EPP y dotación de trabajo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_templates WHERE category = 'dotacion'
);
