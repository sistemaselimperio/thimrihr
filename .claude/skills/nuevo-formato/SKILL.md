---
name: nuevo-formato
description: "Trigger: nuevo formato, nuevo documento, crea el documento, formato SG-SST, imagen de un formato de RRHH. Crea un nuevo tipo de documento a partir de una imagen."
license: Apache-2.0
metadata:
  author: "Nesnidev"
  version: "1.1"
---

## Contrato de activación

Cargar cuando el usuario envíe la imagen de un formato (Excel, PDF, escaneo) o pida crear un documento/formato nuevo en el módulo Documentos.

## Reglas obligatorias

- Cada formato es DISTINTO. Diseñar campos, formulario, previsualización y PDF desde cero según la imagen recibida. Nunca reutilizar campos, textos, listas ni diagramación de documentos anteriores.
- Los documentos existentes (dotación, nómina, liquidación) son referencia SOLO de la estructura del código (contrato `SpecialDoc`, tipo de archivos, estilo), no del contenido.
- Reproducir la imagen fielmente: mismas etiquetas, ortografía, orden, columnas, tablas, códigos de encabezado y textos legales.
- Si algo de la imagen es ilegible o ambiguo, preguntar antes de inventarlo.
- Fuente única de datos: formulario, previsualización, PDF y texto del historial leen el mismo objeto `XInput`.
- Todo documento especial implementa `SpecialDoc<XInput>` y se suma a `SPECIAL_DOCS`. Nunca editar `documentos.tsx`.
- TDD estricto: escribir `src/lib/{x}.test.ts` primero, verlo fallar, luego implementar.
- En los tests, importar con extensión `.ts`; la lib probada solo puede usar `import type` de módulos con imports sin extensión (`./hr`).
- PDF con jsPDF (`await import("jspdf")`) y el helper `loadImage`; unidades en mm. Elegir tamaño y orientación según la imagen.
- Sin migraciones: `document_templates.category` es texto libre.
- No reformatear código existente; aplicar prettier solo a archivos nuevos.
- No hacer commit salvo que se pida.

## Puntos de decisión

| El formato tiene | Ruta |
|---|---|
| Solo texto + datos del empleado (certificado, memorando) | Plantilla de texto: indicar al usuario cómo crearla en la app con `{VARIABLES}`; sin código |
| Tablas, casillas/X, cálculos, diagramación fija | Documento especial: seguir los pasos |

## Pasos

1. Analizar la imagen y listar: **datos variables** (→ `XInput`) y **contenido fijo** (→ constantes: códigos, versión, textos legales, catálogos con claves estables).
2. Si hay cálculos, definir `calcX(input)` puro.
3. Escribir el test de `isX`, `xDefaults`, `validateX`, `xText` y de cada cálculo/helper.
4. Crear `src/lib/{x}.ts`.
5. Crear `src/components/hr/{X}Form.tsx` y `{X}Preview.tsx` con la diagramación propia de este formato.
6. Agregar `download{X}Pdf` al final de `src/lib/pdf-doc.ts`, dibujando el diseño de la imagen.
7. Registrar en `SPECIAL_DOCS` y agregar la categoría según `assets/registro.md`.
8. Verificar: `node --test src/lib/{x}.test.ts src/lib/special-doc.test.ts`, `node_modules/.bin/tsc --noEmit -p .` (0 errores), `npx eslint` sobre archivos nuevos/modificados.

## Contrato de salida

Responder en el idioma del usuario con: archivos creados/modificados, cómo activarlo (categoría o nombre de la plantilla), resultado de la verificación y aviso explícito de que el PDF requiere revisión visual.

## Referencias

- `assets/registro.md` — exportaciones requeridas, entrada del registro y categoría.
- `../../../src/lib/special-doc.ts` — contrato `SpecialDoc<I>`.
- `../../../src/components/hr/special-docs.tsx` — registro `SPECIAL_DOCS`.
- `../../../src/lib/dotacion.ts`, `../../../src/lib/dotacion.test.ts` — ejemplo de estructura (no de contenido).
- `../../../src/lib/pdf-doc.ts` — helpers de PDF (`loadImage`, `pdfFileName`) y ejemplos de dibujo.
