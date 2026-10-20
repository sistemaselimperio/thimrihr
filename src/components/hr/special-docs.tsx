/** Registro de documentos especiales. Para agregar uno: créalo aquí y súmalo a SPECIAL_DOCS. */

import { DotacionForm } from "@/components/hr/DotacionForm";
import { DotacionPreview } from "@/components/hr/DotacionPreview";
import { LiquidacionForm } from "@/components/hr/LiquidacionForm";
import { NominaForm } from "@/components/hr/NominaForm";
import { LiqPreview, NomPreview } from "@/components/hr/SpecialDocPreviews";
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

export const liquidacionDoc: SpecialDoc<LiquidacionInput> = {
  key: "liquidacion",
  matches: isLiquidacion,
  defaults: ({ employee, company, companies }) => liquidacionDefaults(employee, company, companies),
  validate: validateLiquidacion,
  toText: (i) => liquidacionText(i, calcLiquidacion(i)),
  downloadPdf: (i, logoUrl) =>
    downloadLiquidacionPdf({ input: i, calc: calcLiquidacion(i), logoUrl }),
  Form: LiquidacionForm,
  Preview: LiqPreview,
  /* En la liquidación el logo lo define la dependencia elegida. */
  logoPath: (i, { companies, isleroLogoPath }) =>
    dependenciaLogoPath(i.dependenciaKey, companies, isleroLogoPath),
};

/* ---------------------------------------------------------------- nómina */

export const nominaDoc: SpecialDoc<NominaInput> = {
  key: "nomina",
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
  matches: isDotacion,
  defaults: ({ employee }) => dotacionDefaults(employee),
  validate: validateDotacion,
  toText: dotacionText,
  downloadPdf: (i, logoUrl) => downloadDotacionPdf({ input: i, logoUrl }),
  Form: DotacionForm,
  Preview: DotacionPreview,
};

/** El orden importa: el primero que coincide con la plantilla gana. */
export const SPECIAL_DOCS: readonly AnySpecialDoc[] = [liquidacionDoc, nominaDoc, dotacionDoc];
