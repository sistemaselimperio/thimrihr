/** Envoltorios que calculan los valores derivados que necesitan las previsualizaciones. */

import { useMemo } from "react";
import { LiquidacionPreview } from "@/components/hr/LiquidacionPreview";
import { MinTrabajoValidation } from "@/components/hr/MinTrabajoValidation";
import { NominaPreview } from "@/components/hr/NominaPreview";
import { DotacionPreview } from "@/components/hr/DotacionPreview";
import type { DotacionInput } from "@/lib/dotacion";
import { calcLiquidacion, type LiquidacionCalc, type LiquidacionInput } from "@/lib/liquidacion";
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

export function LiqAside({ input }: { input: LiquidacionInput }) {
  const calc = useMemo(() => calcLiquidacion(input), [input]);
  return <MinTrabajoValidation input={input} calc={calc} />;
}

export function NomPreview({ input, logo }: { input: NominaInput; logo: string | null }) {
  const calc = useMemo(() => calcNomina(input), [input]);
  return <NominaPreview input={input} calc={calc} logo={logo} />;
}

/* ------------------------------------------- vistas de los links de firma */

interface SharedViewProps<S> {
  data: S;
  logo: string | null;
  firma: string | null;
}

/** La liquidación compartida conserva el cálculo con el que se envió. */
export function LiqSharedPreview({
  data,
  logo,
  firma,
}: SharedViewProps<{ input: LiquidacionInput; calc: LiquidacionCalc }>) {
  return (
    <LiquidacionPreview
      input={data.input}
      calc={data.calc}
      logo={logo}
      companyName={data.input.dependencia || undefined}
      firma={firma}
    />
  );
}

export function DotSharedPreview({ data, logo, firma }: SharedViewProps<{ input: DotacionInput }>) {
  return <DotacionPreview input={data.input} logo={logo} firma={firma} />;
}
