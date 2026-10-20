/** Registro de documentos especiales. Para agregar uno: créalo aquí y súmalo a SPECIAL_DOCS. */

import { DotacionForm } from "@/components/hr/DotacionForm";
import { DotacionPreview } from "@/components/hr/DotacionPreview";
import { LiquidacionForm } from "@/components/hr/LiquidacionForm";
import { NominaForm } from "@/components/hr/NominaForm";
import {
  DotSharedPreview,
  LiqAside,
  LiqPreview,
  LiqSharedPreview,
  NomPreview,
} from "@/components/hr/SpecialDocPreviews";
import {
  dotacionDefaults,
  dotacionText,
  isDotacion,
  validateDotacion,
  type DotacionInput,
} from "@/lib/dotacion";
import {
  calcLiquidacion,
  dependenciaLogoPath,
  isLiquidacion,
  liquidacionDefaults,
  liquidacionText,
  validateLiquidacion,
  type LiquidacionCalc,
  type LiquidacionInput,
} from "@/lib/liquidacion";
import {
  calcNomina,
  isNomina,
  nominaDefaults,
  nominaText,
  validateNomina,
  type NominaInput,
} from "@/lib/nomina";
import { downloadDotacionPdf, downloadLiquidacionPdf, downloadNominaPdf } from "@/lib/pdf-doc";
import type { AnySpecialDoc, SpecialDoc } from "@/lib/special-doc";

/* ----------------------------------------------------------- liquidación */

export const liquidacionDoc: SpecialDoc<
  LiquidacionInput,
  { input: LiquidacionInput; calc: LiquidacionCalc }
> = {
  key: "liquidacion",
  label: "liquidación",
  matches: isLiquidacion,
  defaults: ({ employee, company, companies }) => liquidacionDefaults(employee, company, companies),
  validate: validateLiquidacion,
  toText: (i) => liquidacionText(i, calcLiquidacion(i)),
  downloadPdf: (i, logoUrl) =>
    downloadLiquidacionPdf({ input: i, calc: calcLiquidacion(i), logoUrl }),
  Form: LiquidacionForm,
  Preview: LiqPreview,
  Aside: LiqAside,
  /* En la liquidación el logo lo define la dependencia elegida. */
  logoPath: (i, { companies, isleroLogoPath }) =>
    dependenciaLogoPath(i.dependenciaKey, companies, isleroLogoPath),
  share: {
    pack: (i) => ({ input: i, calc: calcLiquidacion(i) }),
    Preview: LiqSharedPreview,
    downloadPdf: (d, logoUrl, firma) =>
      downloadLiquidacionPdf({ input: d.input, calc: d.calc, logoUrl, firma }),
  },
};

/* ---------------------------------------------------------------- nómina */

export const nominaDoc: SpecialDoc<NominaInput> = {
  key: "nomina",
  label: "nómina",
  matches: isNomina,
  defaults: ({ employee }) => nominaDefaults(employee),
  validate: validateNomina,
  toText: (i) => nominaText(i, calcNomina(i)),
  downloadPdf: (i, logoUrl) => downloadNominaPdf({ input: i, calc: calcNomina(i), logoUrl }),
  Form: NominaForm,
  Preview: NomPreview,
};

/* ------------------------------------------------------------- dotación */

export const dotacionDoc: SpecialDoc<DotacionInput> = {
  key: "dotacion",
  label: "entrega de dotación",
  matches: isDotacion,
  defaults: ({ employee }) => dotacionDefaults(employee),
  validate: validateDotacion,
  toText: dotacionText,
  downloadPdf: (i, logoUrl) => downloadDotacionPdf({ input: i, logoUrl }),
  Form: DotacionForm,
  Preview: DotacionPreview,
  share: {
    pack: (i) => ({ input: i }),
    Preview: DotSharedPreview,
    downloadPdf: (d, logoUrl, firma) => downloadDotacionPdf({ input: d.input, logoUrl, firma }),
  },
};

/** El orden importa: el primero que coincide con la plantilla gana. */
export const SPECIAL_DOCS: readonly AnySpecialDoc[] = [liquidacionDoc, nominaDoc, dotacionDoc];
