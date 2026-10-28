import type { Carta, CartaSegmento } from "@/lib/carta";

interface Props {
  carta: Carta;
  logo: string | null;
  /** Firma del trabajador (PNG data URL). */
  firma?: string | null | undefined;
}

function Segmentos({ segs }: { segs: CartaSegmento[] }) {
  return (
    <>
      {segs.map((s, k) =>
        s.bold ? <strong key={k}>{s.text}</strong> : <span key={k}>{s.text}</span>,
      )}
    </>
  );
}

/** Vista común de las cartas de autorización (misma diagramación que su PDF). */
export function CartaPreview({ carta: c, logo, firma }: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="mx-auto min-w-[36rem] bg-white px-10 py-6 font-sans text-[12px] leading-relaxed text-black">
        {logo && <img src={logo} alt="Logo de la empresa" className="mb-6 h-14 object-contain" />}

        <p className="mt-4">{c.fechaLinea}</p>

        <div className="mt-8">
          {c.destinatario.map((l, k) => (
            <p key={k} className={l.bold ? "font-bold" : undefined}>
              {l.text}
            </p>
          ))}
        </div>

        <p className="mt-10 font-bold">{c.asunto}</p>

        <p className="mt-8">{c.saludo}</p>
        <p className="mt-4 text-justify">
          <Segmentos segs={c.cuerpo} />
        </p>

        <p className="mt-8">{c.agradecimiento}</p>
        <p className="mt-6">{c.despedida}</p>

        <div className="relative mt-20 w-64 border-t border-black pt-1">
          {firma && (
            <img
              src={firma}
              alt="Firma del trabajador"
              className="absolute bottom-full left-0 mb-1 h-14 object-contain"
            />
          )}
          <Segmentos segs={c.pieFirma} />
        </div>
      </div>
    </div>
  );
}
