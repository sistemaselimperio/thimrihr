import { fmtDate, todayISO, type Company, type Employee } from "./hr";

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
