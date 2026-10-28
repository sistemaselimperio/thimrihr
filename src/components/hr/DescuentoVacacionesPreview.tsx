import { CartaPreview } from "@/components/hr/CartaPreview";
import { dvCarta, type DescuentoVacacionesInput } from "@/lib/descuento-vacaciones";

interface Props {
  input: DescuentoVacacionesInput;
  logo: string | null;
  /** Firma del trabajador (PNG data URL). */
  firma?: string | null;
}

export function DescuentoVacacionesPreview({ input, logo, firma }: Props) {
  return <CartaPreview carta={dvCarta(input)} logo={logo} firma={firma} />;
}
