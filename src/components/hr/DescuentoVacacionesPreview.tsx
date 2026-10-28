import {
  DV_AGRADECIMIENTO,
  DV_ASUNTO,
  DV_CIERRE,
  DV_DESPEDIDA,
  DV_SALUDO,
  descuentoVacacionesCuerpo,
  dvDestinatario,
  dvFechaCarta,
  type DescuentoVacacionesInput,
} from "@/lib/descuento-vacaciones";

interface Props {
  input: DescuentoVacacionesInput;
  logo: string | null;
  /** Firma del trabajador (PNG data URL). */
  firma?: string | null;
}

export function DescuentoVacacionesPreview({ input: i, logo, firma }: Props) {
  const [senores, ...destinatario] = dvDestinatario(i);
  const cuerpo = descuentoVacacionesCuerpo(i);

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto min-w-[36rem] bg-white px-10 py-6 font-sans text-[12px] leading-relaxed text-black">
        {logo && <img src={logo} alt="Logo de la empresa" className="mb-6 h-14 object-contain" />}

        <p className="mt-4">{dvFechaCarta(i.fecha)}</p>

        <div className="mt-8">
          <p>{senores}</p>
          {destinatario.map((l, k) => (
            <p key={k} className={k === 0 ? "font-bold" : undefined}>
              {l}
            </p>
          ))}
        </div>

        <p className="mt-10 font-bold">{DV_ASUNTO}</p>

        <p className="mt-8">{DV_SALUDO}</p>
        <p className="mt-4 text-justify">
          {cuerpo.slice(0, -DV_CIERRE.length)}
          <strong>{DV_CIERRE}</strong>
        </p>

        <p className="mt-8">{DV_AGRADECIMIENTO}</p>
        <p className="mt-6">{DV_DESPEDIDA}</p>

        <div className="relative mt-20 w-64 border-t border-black pt-1">
          {firma && (
            <img
              src={firma}
              alt="Firma del trabajador"
              className="absolute bottom-full left-0 mb-1 h-14 object-contain"
            />
          )}
          C.C. {i.cedula}
        </div>
      </div>
    </div>
  );
}
