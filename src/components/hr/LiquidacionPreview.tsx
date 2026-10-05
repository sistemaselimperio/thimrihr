import {
  constanciaLine,
  fmtCiudadFecha,
  fmtCOP,
  fmtTasa,
  fmtFechaLarga,
  pazYSalvoLine,
  type LiquidacionCalc,
  type LiquidacionInput,
} from "@/lib/liquidacion";

interface Props {
  input: LiquidacionInput;
  calc: LiquidacionCalc;
  logo: string | null;
  companyName?: string | undefined;
  /** Firma del trabajador (PNG data URL). */
  firma?: string | null;
}

const cell = "border border-black px-2 py-1";
const lbl = `${cell} font-bold`;

export function LiquidacionPreview({ input: i, calc: c, logo, companyName, firma }: Props) {
  const concept = (n: number, title: string, formula: React.ReactNode, result: number) => (
    <div className="flex items-start justify-between gap-3 border-b border-black py-2">
      <div className="space-y-0.5">
        <p className="font-bold">
          {n} {title}
        </p>
        <p>{formula}</p>
      </div>
      <p className="shrink-0 font-bold">{fmtCOP(result)}</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto min-w-[34rem] max-w-[46rem] bg-white p-8 font-sans text-[12px] leading-snug text-black">
        <div className="flex items-center gap-4">
          {logo && (
            <img
              src={logo}
              alt={`Logo de ${companyName ?? i.dependencia ?? "la empresa"}`}
              className="h-24 max-w-[16rem] object-contain"
            />
          )}
          <h2 className="flex-1 text-center text-lg font-bold tracking-wide">LIQUIDACIÓN</h2>
        </div>

        <table className="mt-4 w-full border-collapse">
          <tbody>
            <tr>
              <td className={lbl}>CIUDAD Y FECHA</td>
              <td className={cell}>{fmtCiudadFecha(i.ciudad, i.fecha)}</td>
              <td className={lbl}>DEPENDENCIA</td>
              <td className={cell}>{i.dependencia.toUpperCase()}</td>
            </tr>
            <tr>
              <td className={lbl}>NOMBRE DEL TRABAJADOR</td>
              <td className={cell}>{i.nombre.toUpperCase()}</td>
              <td className={lbl}>CÉDULA</td>
              <td className={cell}>
                {i.cedula} DE {i.ciudad.toUpperCase()}
              </td>
            </tr>
            <tr>
              <td className={lbl}>CARGO</td>
              <td className={cell} colSpan={3}>
                {i.cargo.toUpperCase()}
              </td>
            </tr>
            <tr>
              <td className={lbl}>FECHA DE INGRESO</td>
              <td className={cell}>{fmtFechaLarga(i.fechaIngreso)}</td>
              <td className={lbl}>HASTA</td>
              <td className={cell}>{fmtFechaLarga(i.fechaHasta)}</td>
            </tr>
            <tr>
              <td className={lbl}>NÚMERO DÍAS SERVICIO</td>
              <td className={cell}>{i.diasServicio}</td>
              <td className={lbl}>SALARIO BÁSICO MENSUAL $</td>
              <td className={cell}>{fmtCOP(i.salario)}</td>
            </tr>
            <tr>
              <td className={cell} />
              <td className={cell} />
              <td className={lbl}>AUXILIO DE TRANSPORTE $</td>
              <td className={cell}>{fmtCOP(i.auxilio)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4">
          {concept(
            1,
            "CESANTÍAS",
            <>
              No. días trabajados {i.diasCesantias}/{i.divCesantias} × salario básico mensual{" "}
              {fmtCOP(c.base)} = {fmtCOP(c.cesantias)}
            </>,
            c.cesantias,
          )}
          {concept(
            2,
            "INTERESES CESANTÍAS",
            <>
              Valor cesantías {fmtCOP(c.valorCesantias)} × No. días trabajados {i.diasIntereses}/
              {i.divIntereses} ×{fmtTasa(i.tasaIntereses)} = {fmtCOP(c.intereses)}
            </>,
            c.intereses,
          )}
          {concept(
            3,
            "PRIMA DE SERVICIOS",
            <>
              No. días trabajados {i.diasPrima}/{i.divPrima} × salario básico mensual{" "}
              {fmtCOP(c.base)} = {fmtCOP(c.prima)}
            </>,
            c.prima,
          )}
          {concept(
            4,
            "VACACIONES",
            <>
              No. días trabajados {i.diasVacaciones}/{i.divVacaciones} × salario (sin auxilio){" "}
              {fmtCOP(i.salario)} = {fmtCOP(c.vacaciones)}
            </>,
            c.vacaciones,
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-y-2 border-black py-2 text-sm font-bold">
          <span>TOTAL LIQUIDACIÓN $</span>
          <span>{fmtCOP(c.total)}</span>
        </div>

        {i.observaciones?.trim() && (
          <div className="mt-3">
            <p className="font-bold">NOTA</p>
            <p className="mt-1 whitespace-pre-line">{i.observaciones.trim()}</p>
          </div>
        )}

        <p className="mt-6 font-bold">HAGO CONSTAR</p>
        <p className="mt-2">{pazYSalvoLine(i)}</p>
        <p className="mt-4">{constanciaLine(i)}</p>

        <div className="mt-12 flex items-start justify-between gap-10 text-[11px]">
          <div className="flex items-start gap-3">
            <div className="w-52 pt-16">
              <div className="relative border-t border-black pt-1 font-bold">
                {firma && (
                  <img
                    src={firma}
                    alt="Firma del trabajador"
                    className="absolute bottom-full left-0 mb-0.5 h-16 object-contain"
                  />
                )}
                FIRMA DEL TRABAJADOR
                <div className="mt-2">No. CÉDULA: {i.cedula || "______________"}</div>
              </div>
            </div>
            <div className="flex w-24 flex-col">
              <div className="h-24 border border-black" />
              <p className="pt-1 text-center font-bold">HUELLA DEL TRABAJADOR</p>
            </div>
          </div>
          <div className="w-52 pt-16">
            <div className="border-t border-black pt-1 font-bold">FIRMA DEL EMPLEADOR</div>
          </div>
        </div>
      </div>
    </div>
  );
}
