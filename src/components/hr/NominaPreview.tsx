import { fmtIngreso, fmtNum, mesNombre, type NominaCalc, type NominaInput } from "@/lib/nomina";

interface Props {
  input: NominaInput;
  calc: NominaCalc;
  logo: string | null;
}

const cell = "border border-black px-1.5 py-1 text-center";
const head = `${cell} font-bold`;

export function NominaPreview({ input: i, calc: c, logo }: Props) {
  const mes = mesNombre(i.mes);
  return (
    <div className="overflow-x-auto">
      <div className="mx-auto min-w-[46rem] bg-white p-6 font-sans text-[12px] leading-snug text-black">
        {logo && (
          <img src={logo} alt="Logo de la empresa" className="h-20 max-w-[16rem] object-contain" />
        )}

        <div className="mt-4 grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 font-bold">
          <span>NOMINA:</span>
          <span>{i.nombre.toUpperCase()}</span>
          <span>
            C.C. {i.cedula} DE {i.expedicion.toUpperCase()}
          </span>
          <span>MES:</span>
          <span>{mes}</span>
          <span>INGRESO: {fmtIngreso(i.fechaIngreso)}</span>
          <span>AÑO:</span>
          <span>{i.anio}</span>
          <span />
        </div>

        <div className="mt-3 text-center text-sm font-bold">
          <p>RECIBO DE PAGO MENSUAL DE NOMINA</p>
          <p>
            MES DE {mes} DE {i.anio}
          </p>
        </div>

        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr>
              <th className="border-0" colSpan={4} />
              <th className={head} colSpan={3}>
                DEVENGADO
              </th>
              <th className={head} colSpan={4}>
                DEDUCCIONES
              </th>
              <th className="border-0" />
            </tr>
            <tr className="text-[10px]">
              <th className={head}>CÉDULA</th>
              <th className={head}>NOMBRE</th>
              <th className={head}>SALARIO</th>
              <th className={head}>N° DÍAS</th>
              <th className={head}>DEVENGADO</th>
              <th className={head}>AUX. TRASP</th>
              <th className={head}>TOTAL DEV</th>
              <th className={head}>SALUD</th>
              <th className={head}>PENSIÓN</th>
              <th className={head}>O. DEDUC</th>
              <th className={head}>TOTAL DED</th>
              <th className={head}>NETO PAGO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`${cell} text-[9px]`}>{i.cedula}</td>
              <td className={`${cell} text-[9px]`}>{i.nombre}</td>
              <td className={cell}>{fmtNum(i.salario)}</td>
              <td className={cell}>{i.dias}</td>
              <td className={cell}>{fmtNum(c.devengado)}</td>
              <td className={cell}>{fmtNum(c.auxTransporte)}</td>
              <td className={cell}>{fmtNum(c.totalDevengado)}</td>
              <td className={cell}>{fmtNum(c.salud)}</td>
              <td className={cell}>{fmtNum(c.pension)}</td>
              <td className={cell}>{fmtNum(i.otrasDeducciones)}</td>
              <td className={cell}>{fmtNum(c.totalDeducciones)}</td>
              <td className={`${cell} font-bold`}>{fmtNum(c.neto)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-16 w-64 border-t border-black pt-1 font-bold">
          FIRMA
          <div className="mt-1">C.C. {i.cedula}</div>
        </div>
      </div>
    </div>
  );
}
