import { CartaPreview } from "@/components/hr/CartaPreview";
import { diasNoLaboradosCarta, type DiasNoLaboradosInput } from "@/lib/dias-no-laborados";

interface Props {
  input: DiasNoLaboradosInput;
  logo: string | null;
  /** Firma del trabajador (PNG data URL). */
  firma?: string | null;
}

export function DiasNoLaboradosPreview({ input, logo, firma }: Props) {
  return <CartaPreview carta={diasNoLaboradosCarta(input)} logo={logo} firma={firma} />;
}
