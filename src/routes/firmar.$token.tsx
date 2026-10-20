import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileDown, Loader2, PenTool } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SignatureDialog } from "@/components/hr/SignatureDialog";
import { SPECIAL_DOCS } from "@/components/hr/special-docs";
import { getSharedLiquidacion, signSharedLiquidacion } from "@/lib/shared-liquidacion.functions";
import { findSignableDoc } from "@/lib/special-doc";

export const Route = createFileRoute("/firmar/$token")({
  head: () => ({
    meta: [
      { title: "Firmar documento · imperiorrhco" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ params }) => getSharedLiquidacion({ data: { token: params.token } }),
  component: FirmarPage,
});

function FirmarPage() {
  const { token } = Route.useParams();
  const loaded = Route.useLoaderData();
  const sign = useServerFn(signSharedLiquidacion);

  const [firma, setFirma] = useState<string | null>(loaded?.firma ?? null);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [justSigned, setJustSigned] = useState(false);

  const doc = loaded ? findSignableDoc(SPECIAL_DOCS, loaded.kind) : undefined;
  const share = doc?.share;

  if (!loaded || !doc || !share) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-bold">Enlace no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este enlace no existe o ya no está activo. Pide uno nuevo a quien te lo envió.
          </p>
        </div>
      </main>
    );
  }

  const { data, employeeName, logoUrl } = loaded;
  const signed = !!firma;
  const preview = signed ? firma : draft;

  const confirm = async () => {
    if (!draft) return;
    setSending(true);
    try {
      const res = await sign({ data: { token, firma: draft } });
      if (res.ok) {
        setFirma(draft);
        setDraft(null);
        setJustSigned(true);
      } else if (res.reason === "already_signed") {
        toast.error("Este documento ya fue firmado.");
        window.location.reload();
      } else {
        toast.error("El enlace ya no está disponible.");
      }
    } catch {
      toast.error("No se pudo enviar la firma. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const download = async () => {
    try {
      await share.downloadPdf(data, logoUrl, firma);
    } catch {
      toast.error("No se pudo generar el PDF.");
    }
  };

  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="space-y-1 text-center">
          <h1 className="font-display text-2xl font-bold first-letter:uppercase">
            {doc.label} de {employeeName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {signed
              ? "Este documento ya fue firmado."
              : "Revisa el documento y firma al final para confirmarlo."}
          </p>
        </header>

        <div className="overflow-x-auto rounded-xl border bg-surface p-2 shadow-panel sm:p-4">
          <share.Preview data={data} logo={logoUrl} firma={preview} />
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:items-center">
          {justSigned && (
            <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm font-medium">
              <CheckCircle2 className="size-5" /> Firma enviada. ¡Gracias!
            </div>
          )}

          {!signed && !draft && (
            <Button size="lg" variant="success" className="gap-2" onClick={() => setOpen(true)}>
              <PenTool className="size-5" /> Firmar
            </Button>
          )}

          {!signed && draft && (
            <>
              <Button
                size="lg"
                variant="success"
                className="gap-2"
                disabled={sending}
                onClick={() => void confirm()}
              >
                {sending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
                Confirmar y enviar firma
              </Button>
              <Button variant="ghost" disabled={sending} onClick={() => setOpen(true)}>
                Firmar de nuevo
              </Button>
            </>
          )}

          {signed && (
            <Button size="lg" variant="outline" className="gap-2" onClick={() => void download()}>
              <FileDown className="size-5" /> Descargar PDF
            </Button>
          )}
        </div>
      </div>

      <SignatureDialog
        open={open}
        onOpenChange={setOpen}
        onSave={setDraft}
        title={`Firma de ${employeeName}`}
      />
    </main>
  );
}
