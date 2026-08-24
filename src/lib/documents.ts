import { fmtDate, monthLong, todayISO, type Company, type Employee } from "./hr";

export interface DocContext {
  employee: Employee;
  company: Company | undefined;
  extra: string;
}

const HEADER = (company: string) =>
  `${company.toUpperCase()}\nNIT: ____________________\nDepartamento de Recursos Humanos\n\n`;

const FOOTER = `\n\nCordialmente,\n\n\n____________________________\nValen — Recursos Humanos\n${""}`;

function base(ctx: DocContext) {
  const company = ctx.company?.name ?? "El Imperio";
  return {
    company,
    header: HEADER(company),
    fecha: fmtDate(todayISO()),
    nombre: ctx.employee.full_name,
    cedula: ctx.employee.cedula,
    cargo: ctx.employee.position,
    ingreso: fmtDate(ctx.employee.hire_date),
  };
}

/** Cuerpos por categoría de plantilla. */
export function renderDocument(category: string, ctx: DocContext): string {
  const b = base(ctx);
  const intro = `${b.header}${b.fecha}\n\n`;
  const who = `Señor(a) ${b.nombre}\nC.C. ${b.cedula}\nCargo: ${b.cargo}\n\n`;
  const extra = ctx.extra.trim() ? `\n\nObservaciones: ${ctx.extra.trim()}` : "";

  switch (category) {
    case "certificado":
      return `${intro}CERTIFICACIÓN LABORAL\n\nLa empresa ${b.company} certifica que ${b.nombre}, identificado(a) con cédula de ciudadanía ${b.cedula}, labora en esta compañía desde el ${b.ingreso} desempeñando el cargo de ${b.cargo}.\n\nLa presente certificación se expide a solicitud del interesado.${extra}${FOOTER}`;
    case "contrato":
      return `${intro}CONTRATO DE TRABAJO\n\nEntre ${b.company}, en adelante EL EMPLEADOR, y ${b.nombre}, C.C. ${b.cedula}, en adelante EL TRABAJADOR, se celebra el presente contrato de trabajo para desempeñar el cargo de ${b.cargo} a partir del ${b.ingreso}.\n\nCLÁUSULAS:\n1. Objeto y funciones del cargo.\n2. Jornada de trabajo: ${ctx.employee.work_schedule ?? "según asignación"}.\n3. Lugar de trabajo: ${ctx.employee.work_location ?? "según asignación"}.\n4. Salario y forma de pago quincenal.\n5. Duración del contrato: ${ctx.employee.contract_end_date ? `hasta el ${fmtDate(ctx.employee.contract_end_date)}` : "término indefinido"}.${extra}\n\nEn constancia se firma:\n\n\n____________________         ____________________\nEL EMPLEADOR                 EL TRABAJADOR`;
    case "memorando":
      return `${intro}MEMORANDO\n\n${who}Por medio del presente se le hace un llamado de atención por los hechos descritos a continuación:\n\n${ctx.extra.trim() || "____________________________________________"}\n\nSe le recuerda la obligación de cumplir con el reglamento interno de trabajo.${FOOTER}`;
    case "descargos":
      return `${intro}CITACIÓN A DILIGENCIA DE DESCARGOS\n\n${who}Se le cita a diligencia de descargos con el fin de que exponga sus explicaciones respecto de los hechos siguientes:\n\n${ctx.extra.trim() || "____________________________________________"}\n\nPuede asistir acompañado de dos compañeros de trabajo.${FOOTER}`;
    case "terminacion":
      return `${intro}CARTA DE TERMINACIÓN DE CONTRATO\n\n${who}Le informamos que su contrato de trabajo con ${b.company} termina el ${fmtDate(ctx.employee.exit_date ?? ctx.employee.contract_end_date ?? todayISO())}.\n\nSe procederá con la liquidación de las prestaciones sociales a que tenga derecho.${extra}${FOOTER}`;
    case "vacaciones":
      return `${intro}AUTORIZACIÓN DE VACACIONES\n\n${who}Se autoriza el disfrute de vacaciones según lo acordado.\n\n${ctx.extra.trim() || "Periodo autorizado: ____________________"}${FOOTER}`;
    case "permiso":
      return `${intro}AUTORIZACIÓN DE PERMISO\n\n${who}Se autoriza el permiso solicitado en los siguientes términos:\n\n${ctx.extra.trim() || "Fechas y condiciones: ____________________"}${FOOTER}`;
    default:
      return `${intro}${who}${ctx.extra.trim() || "Documento generado desde el sistema de Recursos Humanos."}${FOOTER}`;
  }
}

/* ------------------------------------------------- plantillas con variables */

export interface DocVariable {
  key: string;
  label: string;
  group: string;
}

export const DOC_VARIABLES: DocVariable[] = [
  { key: "NOMBRE", label: "Nombre del empleado", group: "Datos personales" },
  { key: "APELLIDOS", label: "Apellidos", group: "Datos personales" },
  { key: "NOMBRE_COMPLETO", label: "Nombre completo", group: "Datos personales" },
  { key: "CEDULA", label: "Cédula", group: "Datos personales" },
  { key: "CELULAR", label: "Celular", group: "Datos personales" },
  { key: "TELEFONO", label: "Teléfono fijo", group: "Datos personales" },
  { key: "EMAIL", label: "Correo", group: "Datos personales" },
  { key: "CARGO", label: "Cargo", group: "Datos personales" },
  { key: "EMPRESA", label: "Empresa", group: "Datos laborales" },
  { key: "LUGAR_TRABAJO", label: "Lugar de trabajo", group: "Datos laborales" },
  { key: "MUNICIPIO", label: "Municipio", group: "Datos laborales" },
  { key: "HORARIO", label: "Horario", group: "Datos laborales" },
  { key: "FECHA_INGRESO", label: "Fecha de ingreso", group: "Datos laborales" },
  { key: "FECHA_FIN_CONTRATO", label: "Fecha fin de contrato", group: "Datos laborales" },
  { key: "FECHA_SALIDA", label: "Fecha de salida", group: "Datos laborales" },
  { key: "HOY", label: "Fecha de hoy", group: "Fechas" },
  { key: "DIA", label: "Día", group: "Fechas" },
  { key: "MES", label: "Mes", group: "Fechas" },
  { key: "AÑO", label: "Año", group: "Fechas" },
  { key: "LUGAR", label: "Ciudad (municipio)", group: "Fechas" },
  { key: "LOGO", label: "Logo de la empresa (automático)", group: "Logo" },
];

export const DOC_CATEGORIES = [
  { value: "contrato", label: "Contrato" },
  { value: "memorando", label: "Memorando" },
  { value: "permiso", label: "Permiso" },
  { value: "liquidacion", label: "Liquidación" },
  { value: "paz_y_salvo", label: "Paz y salvo" },
  { value: "certificado", label: "Certificado laboral" },
  { value: "descargos", label: "Descargos" },
  { value: "terminacion", label: "Terminación" },
  { value: "otros", label: "Otros" },
];

export function categoryLabel(value: string): string {
  return DOC_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/** Valores de las variables para un empleado concreto. */
export function docValues(
  employee: Employee,
  company: Company | undefined,
): Record<string, string> {
  const today = new Date();
  const dash = "—";
  const first =
    employee.first_name?.trim() || employee.full_name.split(" ").slice(0, 1).join(" ");
  const last =
    employee.last_name?.trim() || employee.full_name.split(" ").slice(1).join(" ");
  return {
    NOMBRE: first || employee.full_name,
    APELLIDOS: last || "",
    NOMBRE_COMPLETO: employee.full_name,
    CEDULA: employee.cedula,
    CELULAR: employee.phone ?? dash,
    TELEFONO: employee.landline ?? dash,
    EMAIL: employee.email ?? dash,
    CARGO: employee.position,
    EMPRESA: company?.name ?? "El Imperio",
    LUGAR_TRABAJO: employee.work_location ?? dash,
    MUNICIPIO: employee.municipality ?? dash,
    HORARIO: employee.work_schedule ?? dash,
    FECHA_INGRESO: fmtDate(employee.hire_date),
    FECHA_FIN_CONTRATO: fmtDate(employee.contract_end_date),
    FECHA_SALIDA: fmtDate(employee.exit_date),
    HOY: fmtDate(todayISO()),
    DIA: String(today.getDate()),
    MES: monthLong(today.getMonth()).toLowerCase(),
    AÑO: String(today.getFullYear()),
    LUGAR: employee.municipality ?? employee.work_location ?? dash,
    LOGO: "",
  };
}

/** Reemplaza {VARIABLE} por el valor del empleado. */
export function fillTemplate(
  body: string,
  employee: Employee,
  company: Company | undefined,
): string {
  const values = docValues(employee, company);
  return body
    .replace(/\{\s*([A-ZÑÁÉÍÓÚ_]+)\s*\}/g, (match, key: string) =>
      key in values ? values[key]! : match,
    )
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
