-- Los links de firma dejan de ser exclusivos de liquidación: cada fila indica su tipo de documento.
ALTER TABLE public.shared_liquidaciones
  ADD COLUMN kind text NOT NULL DEFAULT 'liquidacion';
