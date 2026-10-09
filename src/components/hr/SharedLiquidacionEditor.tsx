import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logoUrl } from "@/components/hr/CompanyLogos";
import { LiquidacionForm } from "@/components/hr/LiquidacionForm";
import { LiquidacionPreview } from "@/components/hr/LiquidacionPreview";
import { qk, useCompanies, useIsleroLogo, type SharedLiquidacion } from "@/lib/data";
import { calcLiquidacion, dependenciaLogoPath, type LiquidacionInput } from "@/lib/liquidacion";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  shared: SharedLiquidacion | null;
  onOpenChange: (open: boolean) => void;
}

/** Edita una liquidación compartida que el trabajador aún no ha firmado. */
export function SharedLiquidacionEditor({ shared, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { data: companies = [] } = useCompanies();
  const { data: isleroLogo } = useIsleroLogo();
  const [input, setInput] = useState<LiquidacionInput | null>(null);
  const [saving, setSaving] = useState(false);

  /* Las liquidaciones compartidas antes de agregar campos nuevos los toman por defecto. */
  useEffect(() => {
    setInput(
      shared
        ? ({
            dependenciaKey: "ninguna",
            divCesantias: 360,
            divIntereses: 360,
            divPrima: 360,
            divVacaciones: 720,
            tasaIntereses: 0.12,
            valorCesantias: null,
            observaciones: "",
            ...(shared.data.input as Partial<LiquidacionInput>),
          } as LiquidacionInput)
        : null,
    );
  }, [shared]);

  const calc = useMemo(() => (input ? calcLiquidacion(input) : null), [input]);
  const logoPath = input
    ? dependenciaLogoPath(input.dependenciaKey, companies, isleroLogo?.path)
    : null;

  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setLogo(null);
    if (logoPath && !logoPath.endsWith(".pdf")) {
      void logoUrl(logoPath).then((url) => {
        if (alive) setLogo(url);
      });
    }
    return () => {
      alive = false;
    };
  }, [logoPath]);

  const save = async () => {
    if (!shared || !input || !calc) return;
    if (!(input.salario > 0)) {
      toast.error("Ingresa el salario básico mensual.");
      return;
    }
    if (!input.fechaIngreso || !input.fechaHasta || input.fechaHasta < input.fechaIngreso) {
      toast.error("Revisa las fechas de ingreso y retiro.");
      return;
    }
    setSaving(true);
    try {
      /* Solo se actualiza si sigue sin firmar: una firmada no se puede modificar. */
      const { data, error } = await supabase
        .from("shared_liquidaciones")
        .update({
          employee_name: input.nombre.trim() || shared.employee_name,
          data: JSON.parse(JSON.stringify({ input, calc })),
          logo_path: logoPath,
        })
        .eq("id", shared.id)
        .is("signed_at", null)
        .select("id");
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: qk.shared });
      if (!data || data.length === 0) {
        toast.error("El trabajador ya firmó esta liquidación; no se puede editar.");
      } else {
        toast.success("Liquidación actualizada. El link sigue siendo el mismo.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!shared} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Editar liquidación de {shared?.employee_name}</DialogTitle>
          <DialogDescription>
            Los cambios se verán en el mismo link que ya compartiste.
          </DialogDescription>
        </DialogHeader>
        {input && calc && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <LiquidacionForm value={input} onChange={setInput} companies={companies} />
            <LiquidacionPreview
              input={input}
              calc={calc}
              logo={logo}
              companyName={input.dependencia || undefined}
            />
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving || !input} onClick={() => void save()}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
