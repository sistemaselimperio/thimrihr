/** Registro de documentos especiales. Para agregar uno: créalo aquí y súmalo a SPECIAL_DOCS. */

import { DescuentoVacacionesForm } from "@/components/hr/DescuentoVacacionesForm";
import { DescuentoVacacionesPreview } from "@/components/hr/DescuentoVacacionesPreview";
import { DiasNoLaboradosForm } from "@/components/hr/DiasNoLaboradosForm";
import { DiasNoLaboradosPreview } from "@/components/hr/DiasNoLaboradosPreview";
import { DotacionForm } from "@/components/hr/DotacionForm";
import { DotacionPreview } from "@/components/hr/DotacionPreview";
import { LiquidacionForm } from "@/components/hr/LiquidacionForm";
import { NominaForm } from "@/components/hr/NominaForm";
import {
  DnlSharedPreview,
  DotSharedPreview,
  DvSharedPreview,
  LiqAside,
  LiqPreview,
  LiqSharedPreview,
  NomPreview,
} from "@/components/hr/SpecialDocPreviews";
import {
  descuentoVacacionesDefaults,
  descuentoVacacionesText,
  isDescuentoVacaciones,
  validateDescuentoVacaciones,
  type DescuentoVacacionesInput,
} from "@/lib/descuento-vacaciones";
import {
  diasNoLaboradosDefaults,
  diasNoLaboradosText,
  isDiasNoLaborados,
  validateDiasNoLaborados,
  type DiasNoLaboradosInput,
} from "@/lib/dias-no-laborados";
import {
  dotacionDefaults,
  dotacionLogoPath,
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
import {
  downloadDescuentoVacacionesPdf,
  downloadDiasNoLaboradosPdf,
  downloadDotacionPdf,
  downloadLiquidacionPdf,
  downloadNominaPdf,
} from "@/lib/pdf-doc";
import type { AnySpecialDoc, SpecialDoc } from "@/lib/special-doc";

/* ----------------------------------------------------------- liquidación */

/** Validación contra la calculadora del MinTrabajo: oculta hasta que esté bien configurada. */
const MINTRABAJO_ENABLED = false;

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
  ...(MINTRABAJO_ENABLED ? { Aside: LiqAside } : {}),
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
  /* El logo es el de la empresa elegida en el formulario. */
  logoPath: (i, { companies }) => dotacionLogoPath(i.empresaId, companies),
  share: {
    pack: (i) => ({ input: i }),
    Preview: DotSharedPreview,
    downloadPdf: (d, logoUrl, firma) => downloadDotacionPdf({ input: d.input, logoUrl, firma }),
  },
};

/* ------------------------------------------------ descuento de vacaciones */

export const descuentoVacacionesDoc: SpecialDoc<DescuentoVacacionesInput> = {
  key: "descuento_vacaciones",
  label: "autorización de descuento de vacaciones",
  matches: isDescuentoVacaciones,
  defaults: ({ employee }) => descuentoVacacionesDefaults(employee),
  validate: validateDescuentoVacaciones,
  toText: descuentoVacacionesText,
  downloadPdf: (i, logoUrl) => downloadDescuentoVacacionesPdf({ input: i, logoUrl }),
  Form: DescuentoVacacionesForm,
  Preview: DescuentoVacacionesPreview,
  /* El logo es el de la empresa elegida en el formulario. */
  logoPath: (i, { companies }) => dotacionLogoPath(i.empresaId, companies),
  share: {
    pack: (i) => ({ input: i }),
    Preview: DvSharedPreview,
    downloadPdf: (d, logoUrl, firma) =>
      downloadDescuentoVacacionesPdf({ input: d.input, logoUrl, firma }),
  },
};

/* ------------------------------------------------ días no laborados */

export const diasNoLaboradosDoc: SpecialDoc<DiasNoLaboradosInput> = {
  key: "dias_no_laborados",
  label: "autorización de descuento por días no laborados",
  matches: isDiasNoLaborados,
  defaults: ({ employee }) => diasNoLaboradosDefaults(employee),
  validate: validateDiasNoLaborados,
  toText: diasNoLaboradosText,
  downloadPdf: (i, logoUrl) => downloadDiasNoLaboradosPdf({ input: i, logoUrl }),
  Form: DiasNoLaboradosForm,
  Preview: DiasNoLaboradosPreview,
  /* El logo es el de la empresa elegida en el formulario. */
  logoPath: (i, { companies }) => dotacionLogoPath(i.empresaId, companies),
  share: {
    pack: (i) => ({ input: i }),
    Preview: DnlSharedPreview,
    downloadPdf: (d, logoUrl, firma) =>
      downloadDiasNoLaboradosPdf({ input: d.input, logoUrl, firma }),
  },
};

/** El orden importa: el primero que coincide con la plantilla gana. */
export const SPECIAL_DOCS: readonly AnySpecialDoc[] = [
  liquidacionDoc,
  nominaDoc,
  dotacionDoc,
  descuentoVacacionesDoc,
  diasNoLaboradosDoc,
];
