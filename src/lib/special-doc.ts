/** Contrato de los documentos especiales (formulario + previsualización + PDF propios). */

import type { ComponentType } from "react";
import type { Company, Employee } from "./hr";

export interface TemplateLike {
  category?: string | null;
  name?: string | null;
}

export interface SpecialDocContext {
  employee: Employee;
  company: Company | undefined;
  companies: readonly Company[];
}

export interface SpecialDoc<I> {
  key: string;
  matches: (t: TemplateLike) => boolean;
  defaults: (ctx: SpecialDocContext) => I;
  /** Mensaje de error para el usuario, o null si es válido. */
  validate: (input: I) => string | null;
  /** Texto plano que se guarda en el historial. */
  toText: (input: I) => string;
  downloadPdf: (input: I, logoUrl: string | null) => Promise<boolean>;
  Form: ComponentType<{
    value: I;
    onChange: (next: I) => void;
    companies: readonly Company[];
  }>;
  Preview: ComponentType<{ input: I; logo: string | null }>;
  /** Panel extra debajo de la previsualización. */
  Aside?: ComponentType<{ input: I }>;
  /** Ruta del logo cuando la define el propio documento y no la empresa del empleado. */
  logoPath?: (
    input: I,
    ctx: { companies: readonly Company[]; isleroLogoPath: string | null | undefined },
  ) => string | null;
}

/* La página maneja tipos de documento distintos en un mismo estado: cada entrada del
   registro solo recibe el input que produjo su propio `defaults`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySpecialDoc = SpecialDoc<any>;

/** El primero registrado gana cuando varias plantillas coinciden. */
export function findSpecialDoc<D extends { matches: (t: TemplateLike) => boolean }>(
  docs: readonly D[],
  template: TemplateLike,
): D | undefined {
  return docs.find((d) => d.matches(template));
}
