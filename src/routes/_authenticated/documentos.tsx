import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logoUrl } from "@/components/hr/CompanyLogos";
import { useCompanies, useEmployees, useTemplates } from "@/lib/data";
import { renderDocument } from "@/lib/documents";
import { downloadText } from "@/lib/excel";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos · imperiorrhco" },
      {
        name: "description",
        content:
          "Generación automática de certificaciones laborales, contratos, memorandos y cartas de terminación con los datos del empleado.",
      },
      { property: "og:title", content: "Documentos · imperiorrhco" },
      {
        property: "og:description",
        content: "Certificados, contratos, memorandos y cartas generados automáticamente.",
      },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();
  const { data: templates = [] } = useTemplates();

  const [employeeId, setEmployeeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [extra, setExtra] = useState("");

  const employee = employees.find((e) => e.id === employeeId);
  const template = templates.find((t) => t.id === templateId);
  const company = companies.find((c) => c.id === employee?.company_id);

  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setLogo(null);
    const path = company?.logo_path;
    if (path && !path.endsWith(".pdf")) {
      void logoUrl(path).then((url) => {
        if (alive) setLogo(url);
      });
    }
    return () => {
      alive = false;
    };
  }, [company?.logo_path]);

  const text = useMemo(() => {
    if (!employee || !template) return "";
    return renderDocument(template.category, {
      employee,
      company,
      extra,
    });
  }, [employee, template, company, extra]);

  const download = () => {
    if (!text || !employee || !template) {
      toast.error("Selecciona empleado y plantilla");
      return;
    }
    downloadText(`${template.name.replace(/\s+/g, "_")}_${employee.cedula}.txt`, text);
    toast.success("Documento generado");
  };

  const print = () => {
    if (!text) {
      toast.error("Selecciona empleado y plantilla");
      return;
    }
    const win = window.open("", "_blank", "noopener,width=800,height=1000");
    if (!win) return;
    const safe = text.replace(
      /[<>&]/g,
      (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c,
    );
    const img = logo
      ? `<img src="${logo}" alt="Logo" style="height:110px;object-fit:contain;display:block;margin-bottom:20px" onload="window.print()" onerror="window.print()" />`
      : "";
    win.document.write(
      `<div style="padding:48px"><div style="text-align:left">${img}</div><pre style="font-family:Georgia,serif;font-size:13px;white-space:pre-wrap;line-height:1.6;margin:0">${safe}</pre></div>`,
    );
    win.document.close();
    if (!logo) win.print();
  };


  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Elige una plantilla y el sistema completa los datos del empleado automáticamente.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-4 rounded-xl border bg-surface p-5 shadow-panel">
          <div className="space-y-1.5">
            <Label>
              Empleado <span className="text-danger-foreground">*</span>
            </Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name} — {e.cedula}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Plantilla <span className="text-danger-foreground">*</span>
            </Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plantilla" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {template?.description && (
              <p className="text-[11px] text-muted-foreground">{template.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="extra">Texto adicional</Label>
            <Textarea
              id="extra"
              rows={6}
              placeholder="Hechos, fechas del permiso, observaciones…"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="success" className="gap-2" onClick={download}>
              <FileDown className="size-4" /> Descargar
            </Button>
            <Button variant="outline" className="gap-2" onClick={print}>
              <Printer className="size-4" /> Imprimir
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-surface p-6 shadow-panel">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Previsualización</p>
          {logo && (
            <img
              src={logo}
              alt={`Logo de ${company?.name ?? "la empresa"}`}
              className="mt-3 h-20 object-contain"
            />
          )}
          {text && !logo && company && (
            <p className="mt-3 text-[11px] text-warning-foreground">
              Esta empresa no tiene logo configurado; el documento se generará sin logo.
            </p>
          )}
          <pre className="mt-3 min-h-96 whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {text || "Selecciona un empleado y una plantilla para ver el documento."}
          </pre>

        </div>
      </div>
    </div>
  );
}
