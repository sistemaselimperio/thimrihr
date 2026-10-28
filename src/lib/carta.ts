/** Modelo común de las cartas (autorizaciones) que se diagraman igual: logo, fecha,
 *  destinatario, asunto, párrafo y firma del trabajador. Solo tipos. */

export interface CartaSegmento {
  text: string;
  bold?: boolean | undefined;
}

export interface Carta {
  /** "Chiquinquirá, 2 de octubre de 2026" */
  fechaLinea: string;
  destinatario: CartaSegmento[];
  asunto: string;
  saludo: string;
  /** Párrafo principal; los segmentos en negrita se respetan en la vista y el PDF. */
  cuerpo: CartaSegmento[];
  agradecimiento: string;
  despedida: string;
  /** Pie bajo la línea de firma: "C.C. 123". */
  pieFirma: CartaSegmento[];
}
