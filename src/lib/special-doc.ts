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

/** Envío del documento por link para que el trabajador lo firme. */
export interface SpecialDocShare<I, S> {
  /** Datos que se guardan en el link; la página de firma los recibe tal cual. */
  pack: (input: I) => S;
  Preview: ComponentType<{ data: S; logo: string | null; firma: string | null }>;
  downloadPdf: (data: S, logoUrl: string | null, firma: string | null) => Promise<boolean>;
}

export interface SpecialDoc<I, S = { input: I }> {
  /** También es el `kind` guardado en los links de firma: no cambiarlo. */
  key: string;
  /** Nombre en minúsculas para textos: "liquidación", "entrega de dotación". */
  label: string;
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
  /** Si existe, el documento se puede compartir para firmar. */
  share?: SpecialDocShare<I, S>;
}

/* La página maneja tipos de documento distintos en un mismo estado: cada entrada del
   registro solo recibe el input que produjo su propio `defaults`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySpecialDoc = SpecialDoc<any, any>;

/** El primero registrado gana cuando varias plantillas coinciden. */
export function findSpecialDoc<D extends { matches: (t: TemplateLike) => boolean }>(
  docs: readonly D[],
  template: TemplateLike,
): D | undefined {
  return docs.find((d) => d.matches(template));
}

/** Documento firmable que corresponde al `kind` guardado en un link de firma. */
export function findSignableDoc<D extends { key: string; share?: unknown }>(
  docs: readonly D[],
  kind: string,
): D | undefined {
  return docs.find((d) => d.key === kind && d.share);
}
