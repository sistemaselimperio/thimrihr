/** Envoltorios que calculan los valores derivados que necesitan las previsualizaciones. */

import { useMemo } from "react";
import { LiquidacionPreview } from "@/components/hr/LiquidacionPreview";
import { NominaPreview } from "@/components/hr/NominaPreview";
import { calcLiquidacion, type LiquidacionInput } from "@/lib/liquidacion";
import { calcNomina, type NominaInput } from "@/lib/nomina";

export function LiqPreview({ input, logo }: { input: LiquidacionInput; logo: string | null }) {
  const calc = useMemo(() => calcLiquidacion(input), [input]);
  return (
    <LiquidacionPreview
      input={input}
      calc={calc}
      logo={logo}
      companyName={input.dependencia || undefined}
    />
  );
}

export function NomPreview({ input, logo }: { input: NominaInput; logo: string | null }) {
  const calc = useMemo(() => calcNomina(input), [input]);
  return <NominaPreview input={input} calc={calc} logo={logo} />;
}
