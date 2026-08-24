import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { insertRow, qk, updateRow, type DocumentTemplate } from "@/lib/data";
import { DOC_CATEGORIES, DOC_VARIABLES } from "@/lib/documents";
import { useCompanies } from "@/lib/data";

const ALL = "__all__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: DocumentTemplate | undefined;
}

export function TemplateDialog({ open, onOpenChange, template }: Props) {
  const qc = useQueryClient();
  const { data: companies = [] } = useCompanies();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("contrato");
  const [companyId, setCompanyId] = useState(ALL);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setCategory(template?.category ?? "contrato");
    setCompanyId(template?.company_id ?? ALL);
    setBody(template?.body ?? "");
  }, [open, template]);

  const save = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error("El nombre y el contenido son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const row = {
        name: name.trim(),
        category,
        company_id: companyId === ALL ? null : companyId,
        body,
      };
      if (template) await updateRow("document_templates", template.id, row);
      else await insertRow("document_templates", row);
      await qc.invalidateQueries({ queryKey: qk.templates });
      toast.success(template ? "Documento actualizado" : "Documento creado");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const insertVar = (key: string) => {
    const token = `{${key}}`;
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => `${prev}${token}`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`;
    setBody(next);
    const caret = start + token.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar documento base" : "Crear nuevo documento base"}
          </DialogTitle>
          <DialogDescription>
            Pega el texto del documento y reemplaza los datos que cambian por variables como{" "}
            {"{NOMBRE}"} o {"{CEDULA}"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="tpl-name">
              Nombre del documento <span className="text-danger-foreground">*</span>
            </Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contrato Conductor - Transportes"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Tipo <span className="text-danger-foreground">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Empresa (opcional)</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Si lo dejas en “Todas”, el documento sirve para empleados de cualquier empresa.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tpl-body">
            Contenido del documento <span className="text-danger-foreground">*</span>
          </Label>
          <Textarea
            id="tpl-body"
            ref={bodyRef}
            rows={16}
            className="font-mono text-xs"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              "CONTRATO DE TRABAJO A TÉRMINO FIJO\n\nEn {LUGAR}, a los {DIA} días del mes de {MES} del año {AÑO}...\n\nEMPLEADOR: {EMPRESA}\nTRABAJADOR: {NOMBRE_COMPLETO}\nCÉDULA: {CEDULA}\nCARGO: {CARGO}"
            }
          />
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium">Variables disponibles (clic para insertar)</p>
          <div className="flex flex-wrap gap-1.5">
            {DOC_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.label}
                onClick={() => insertVar(v.key)}
                className="rounded border bg-background px-2 py-0.5 font-mono text-[11px] hover:bg-accent"
              >
                {`{${v.key}}`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            El logo de la empresa se agrega automáticamente en la parte superior del PDF.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={save} disabled={saving}>
            {template ? "Guardar" : "Crear documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
