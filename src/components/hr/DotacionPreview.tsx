import {
  DOTACION_CODIGO,
  DOTACION_COMPROMISO,
  DOTACION_FECHA_FORMATO,
  DOTACION_ITEMS,
  DOTACION_TITULO,
  DOTACION_VERSION,
  dotacionFechaPartes,
  type DotacionInput,
} from "@/lib/dotacion";

interface Props {
  input: DotacionInput;
  logo: string | null;
}

const cell = "border border-black px-1.5 py-0.5";
const band = "border border-black py-0.5 text-center font-bold";

export function DotacionPreview({ input: i, logo }: Props) {
  const f = dotacionFechaPartes(i.fecha);
  const col = (c: 0 | 1) => DOTACION_ITEMS.filter((it) => it.col === c);
  const rows = col(0).map((l, k) => [l, col(1)[k]] as const);
  const mark = (key: string | undefined) => (key && i.entregados.includes(key) ? "X" : "");

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto min-w-[40rem] bg-white p-4 font-sans text-[11px] leading-snug text-black">
        {/* Encabezado */}
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={`${cell} w-32`} rowSpan={2}>
                {logo && (
                  <img src={logo} alt="Logo de la empresa" className="h-14 object-contain" />
                )}
              </td>
              <td className={`${cell} text-center font-bold`}>
                SISTEMA GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO
              </td>
              <td className={`${cell} w-32`}>
                Código: {DOTACION_CODIGO}
                <br />
                Fecha: {DOTACION_FECHA_FORMATO}
              </td>
            </tr>
            <tr>
              <td className={`${cell} text-center font-bold`}>{DOTACION_TITULO}</td>
              <td className={cell}>
                Versión: {DOTACION_VERSION}
                <br />
                Página 1 de 1
              </td>
            </tr>
          </tbody>
        </table>

        {/* Fecha */}
        <table className="mt-3 border-collapse text-center">
          <tbody>
            <tr className="font-bold">
              <td className={`${cell} w-16`}>dd</td>
              <td className={`${cell} w-16`}>mm</td>
              <td className={`${cell} w-16`}>aaaa</td>
            </tr>
            <tr>
              <td className={cell}>{f.dd}</td>
              <td className={cell}>{f.mm}</td>
              <td className={cell}>{f.aaaa}</td>
            </tr>
          </tbody>
        </table>

        <div className={`${band} mt-2`}>DATOS DEL FUNCIONARIO</div>
        <div className="grid grid-cols-[auto_1fr_auto_10rem] items-end gap-x-3 gap-y-2 px-1 py-2">
          <span>Nombre:</span>
          <span className="border-b border-black text-center">{i.nombre}</span>
          <span>C.C.</span>
          <span className="border-b border-black text-center">{i.cedula}</span>
          <span>Cargo:</span>
          <span className="border-b border-black text-center">{i.cargo}</span>
          <span>Proceso:</span>
          <span className="border-b border-black text-center">{i.proceso}</span>
        </div>

        <div className={band}>DOTACION ENTREGADA</div>
        <div className="grid grid-cols-[1fr_4rem_1fr_4rem] gap-x-3 px-6 py-1">
          {rows.map(([l, r]) => (
            <div key={l.key} className="contents">
              <span>{l.label}</span>
              <span className="border-b border-black text-center">{mark(l.key)}</span>
              <span>{r?.label}</span>
              <span className="border-b border-black text-center">{mark(r?.key)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t border-black pt-1 text-justify">
          {DOTACION_COMPROMISO.map((p) => (
            <p key={p.slice(0, 20)}>{p}</p>
          ))}
        </div>

        <div className={`${band} mt-2 py-3`}>FIRMAS</div>
        <div className="grid grid-cols-2 gap-8 px-6 pt-14 pb-2">
          <div className="border-t border-black pt-1 text-center">QUIEN ENTREGA</div>
          <div className="border-t border-black pt-1">
            FIRMA DE QUIEN RECIBE EL ELEMENTO Y LEE EL COMPROMISO
            <br />
            C.C. No {i.cedula}
          </div>
        </div>
      </div>
    </div>
  );
}
