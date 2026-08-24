import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { qk, updateRow } from "@/lib/data";
import type { Company } from "@/lib/hr";

const BUCKET = "logos";
const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function logoUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

function LogoCard({ company }: { company: Company }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setPreview(null);
    if (company.logo_path && !company.logo_path.endsWith(".pdf")) {
      void logoUrl(company.logo_path).then((url) => {
        if (alive) setPreview(url);
      });
    }
    return () => {
      alive = false;
    };
  }, [company.logo_path]);

  const pick = () => inputRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato no permitido. Usa PNG, JPG o PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("El archivo supera los 5 MB.");
      return;
    }
    setState("loading");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${company.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (error) throw new Error(error.message);
      if (company.logo_path) {
        await supabase.storage.from(BUCKET).remove([company.logo_path]);
      }
      await updateRow("companies", company.id, { logo_path: path, logo_name: file.name });
      await qc.invalidateQueries({ queryKey: qk.companies });
      setState("idle");
      toast.success("Logo subido");
    } catch (e) {
      setState("error");
      toast.error(e instanceof Error ? e.message : "Error al subir el logo");
    }
  };

  const remove = async () => {
    if (!company.logo_path) return;
    setState("loading");
    try {
      await supabase.storage.from(BUCKET).remove([company.logo_path]);
      await updateRow("companies", company.id, { logo_path: null, logo_name: null });
      await qc.invalidateQueries({ queryKey: qk.companies });
      setState("idle");
      toast.success("Logo eliminado");
    } catch (e) {
      setState("error");
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const has = Boolean(company.logo_path);

  return (
    <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <p className="text-xs font-bold tracking-wide uppercase">Logo — {company.name}</p>
        {state === "loading" ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> En progreso
          </span>
        ) : state === "error" ? (
          <span className="flex items-center gap-1 text-xs text-danger-foreground">
            <AlertTriangle className="size-3.5" /> Error
          </span>
        ) : has ? (
          <span className="flex items-center gap-1 text-xs text-success-foreground">
            <CheckCircle2 className="size-3.5" /> Subido
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-warning-foreground">
            <AlertTriangle className="size-3.5" /> Sin logo
          </span>
        )}
      </div>

      <div className="flex gap-4 p-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {preview ? (
            <img src={preview} alt={`Logo de ${company.name}`} className="size-full object-contain" />
          ) : (
            <span className="px-1 text-center text-[10px] text-muted-foreground">
              {has ? "PDF" : "Sin logo"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm">
            Logo actual:{" "}
            <span className="font-medium">{company.logo_name ?? "No cargado"}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Tamaño: 150x150 px (recomendado) · PNG, JPG o PDF · máx. 5 MB
          </p>
          {!has && (
            <p className="text-[11px] text-warning-foreground">
              Este logo no está configurado. Los documentos de esta empresa se generarán sin logo.
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant={has ? "outline" : "success"}
              className="gap-1.5"
              disabled={state === "loading"}
              onClick={pick}
            >
              <Upload className="size-3.5" /> {has ? "Cambiar" : "Subir logo"}
            </Button>
            {has && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={state === "loading"}
                onClick={() => void remove()}
              >
                <Trash2 className="size-3.5" /> Eliminar
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function CompanyLogos({ companies }: { companies: Company[] }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-sm font-bold">Logos de empresas</h2>
      <p className="text-xs text-muted-foreground">
        Sube un logo para cada empresa. Se usarán automáticamente en los documentos generados.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {companies.map((c) => (
          <LogoCard key={c.id} company={c} />
        ))}
      </div>
    </section>
  );
}
