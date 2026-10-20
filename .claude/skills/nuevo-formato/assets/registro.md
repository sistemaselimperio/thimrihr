# Registrar un documento especial

`documentos.tsx` es genérico y NO se edita para un documento nuevo. Reemplazar `X`/`x` por el nombre del nuevo tipo. Los campos de `XInput` salen de la imagen de ESTE formato.

## 1. src/lib/{x}.ts

Además del tipo `XInput`, constantes y helpers propios del formato, exportar:

```ts
export function isX(t: { category?: string | null; name?: string | null }): boolean
export function xDefaults(employee: Employee): XInput   // prellenar con datos del empleado
export function validateX(i: XInput): string | null     // mensaje para el usuario o null
export function xText(i: XInput): string                // texto plano para el historial
```

## 2. src/lib/pdf-doc.ts

```ts
export async function downloadXPdf(opts: { input: XInput; logoUrl?: string | null; fileName?: string }): Promise<boolean>
```

## 3. src/components/hr/special-docs.tsx

```ts
export const xDoc: SpecialDoc<XInput> = {
  key: "x",
  matches: isX,
  defaults: ({ employee }) => xDefaults(employee),
  validate: validateX,
  toText: xText,
  downloadPdf: (i, logoUrl) => downloadXPdf({ input: i, logoUrl }),
  Form: XForm,       // props: { value, onChange } (companies opcional)
  Preview: XPreview, // props: { input, logo }
};

export const SPECIAL_DOCS = [liquidacionDoc, nominaDoc, dotacionDoc, xDoc];
```

- El orden importa: gana el primero que coincide. Los matchers más específicos van primero.
- Si la previsualización necesita valores calculados, crear un envoltorio en `SpecialDocPreviews.tsx` (no en `special-docs.tsx`, rompe fast refresh).
- Opcionales: `Aside` (panel debajo de la previsualización) y `logoPath` (logo definido por el input y no por la empresa del empleado).

## 4. src/lib/documents.ts

Agregar a `DOC_CATEGORIES`: `{ value: "x", label: "Nombre visible en la app" }`.

## Activación para el usuario

Crear una plantilla en Documentos con la categoría nueva, o con un nombre que coincida con la regex de `isX`.
