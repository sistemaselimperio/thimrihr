import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  FileDown,
  FilePlus2,
  History,
  MessageCircle,
  Pencil,
  PenTool,
  Printer,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useCelebration } from "@/components/hr/Celebration";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logoUrl } from "@/components/hr/CompanyLogos";
import { TemplateDialog } from "@/components/hr/TemplateDialog";
import {
  deleteRow,
  insertRow,
  qk,
  useCompanies,
  useEmployees,
  useGeneratedDocuments,
  useIsleroLogo,
  useSharedLiquidaciones,
  useTemplates,
  type DocumentTemplate,
  type SharedLiquidacion,
} from "@/lib/data";
import { categoryLabel, fillTemplate, renderDocument } from "@/lib/documents";
import { AUTENTIC_URL } from "@/lib/print-doc";
import { downloadDocumentPdf, downloadLiquidacionPdf, downloadNominaPdf } from "@/lib/pdf-doc";
import {
  calcLiquidacion,
  dependenciaLogoPath,
  isLiquidacion,
  liquidacionDefaults,
  liquidacionText,
  type LiquidacionInput,
} from "@/lib/liquidacion";
import { LiquidacionForm } from "@/components/hr/LiquidacionForm";
import { LiquidacionPreview } from "@/components/hr/LiquidacionPreview";
import { calcNomina, isNomina, nominaDefaults, nominaText, type NominaInput } from "@/lib/nomina";
import { NominaForm } from "@/components/hr/NominaForm";
import { NominaPreview } from "@/components/hr/NominaPreview";
import { SharedLiquidacionEditor } from "@/components/hr/SharedLiquidacionEditor";
import { DocumentText } from "@/components/hr/DocumentText";
import { fmtDate } from "@/lib/hr";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos · imperiorrhco" },
      {
        name: "description",
        content:
          "Crea documentos base en texto con variables y genera PDF con el logo de la empresa y los datos del empleado.",
      },
      { property: "og:title", content: "Documentos · imperiorrhco" },
      {
        property: "og:description",
        content: "Documentos base con variables, logo automático y PDF listo para firmar.",
      },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const qc = useQueryClient();
  const celebrate = useCelebration();
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();
  const { data: templates = [] } = useTemplates();
  const { data: history = [] } = useGeneratedDocuments();
  const { data: shared = [] } = useSharedLiquidaciones();
  const [editingShared, setEditingShared] = useState<SharedLiquidacion | null>(null);

  const [tab, setTab] = useState("base");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentTemplate | undefined>(undefined);

  const [templateId, setTemplateId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [search, setSearch] = useState("");
  /* Texto adicional temporal: se usa solo en el PDF actual, nunca se guarda en el borrador. */
  const [extra, setExtra] = useState("");
  /* Posición de inserción: "start" = al inicio, "end" = al final, n = después del renglón n. */
  const [extraPos, setExtraPos] = useState("end");

  const template = templates.find((t) => t.id === templateId);
  const employee = employees.find((e) => e.id === employeeId);
  const company = companies.find((c) => c.id === employee?.company_id);
  const companyName = (id: string | null) =>
    id ? (companies.find((c) => c.id === id)?.name ?? "—") : "Todas";

  const isLiq = !!template && isLiquidacion(template);
  const [liq, setLiq] = useState<LiquidacionInput | null>(null);
  useEffect(() => {
    setLiq(isLiq && employee ? liquidacionDefaults(employee, company, companies) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiq, employee?.id, company?.id, template?.id]);
  const liqCalc = useMemo(() => (liq ? calcLiquidacion(liq) : null), [liq]);

  const isNom = !!template && !isLiq && isNomina(template);
  const [nom, setNom] = useState<NominaInput | null>(null);
  useEffect(() => {
    setNom(isNom && employee ? nominaDefaults(employee) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNom, employee?.id, template?.id]);
  const nomCalc = useMemo(() => (nom ? calcNomina(nom) : null), [nom]);

  /* Enlace público para que el trabajador firme su liquidación. */
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareName, setShareName] = useState("");
  const [sharing, setSharing] = useState(false);

  const { data: isleroLogo } = useIsleroLogo();

  const isIslero = useMemo(() => {
    const hay = `${employee?.position ?? ""} ${employee?.work_location ?? ""}`.toLowerCase();
    return hay.includes("isler");
  }, [employee?.position, employee?.work_location]);

  /* En la liquidación el logo lo define la dependencia elegida. */
  const logoPath =
    isLiq && liq
      ? dependenciaLogoPath(liq.dependenciaKey, companies, isleroLogo?.path)
      : isIslero
        ? (isleroLogo?.path ?? company?.logo_path ?? null)
        : (company?.logo_path ?? null);

  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setLogo(null);
    const path = logoPath;
    if (path && !path.endsWith(".pdf")) {
      void logoUrl(path).then((url) => {
        if (alive) setLogo(url);
      });
    }
    return () => {
      alive = false;
    };
  }, [logoPath]);

  const visibleEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees
      .filter((e) => !template?.company_id || e.company_id === template.company_id)
      .filter(
        (e) =>
          !term ||
          e.full_name.toLowerCase().includes(term) ||
          e.cedula.toLowerCase().includes(term),
      )
      .slice(0, 60);
  }, [employees, search, template?.company_id]);

  const baseText = useMemo(() => {
    if (!employee || !template) return "";
    if (template.body?.trim()) return fillTemplate(template.body, employee, company);
    return renderDocument(template.category, { employee, company, extra: "" });
  }, [employee, template, company]);

  const lines = useMemo(
    () => baseText.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0),
    [baseText],
  );

  const text = useMemo(() => {
    if (!baseText) return "";
    const add = extra.trim();
    if (!add) return baseText;
    if (extraPos === "start") return `${add}\n\n${baseText}`;
    if (extraPos === "end") return `${baseText}\n\n${add}`;
    const idx = Number(extraPos);
    if (!Number.isFinite(idx)) return `${baseText}\n\n${add}`;
    const parts = [...lines];
    parts.splice(idx + 1, 0, add);
    return parts.join("\n\n");
  }, [baseText, extra, extraPos, lines]);

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (t: DocumentTemplate) => {
    setEditing(t);
    setDialogOpen(true);
  };

  const use = (t: DocumentTemplate) => {
    setTemplateId(t.id);
    setEmployeeId("");
    setSearch("");
    setExtra("");
    setExtraPos("end");
    setTab("generar");
  };

  const remove = async (t: DocumentTemplate) => {
    try {
      await deleteRow("document_templates", t.id);
      await qc.invalidateQueries({ queryKey: qk.templates });
      if (templateId === t.id) setTemplateId("");
      toast.success("Documento base eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const saveHistory = async () => {
    if (!template || !employee) return;
    try {
      await insertRow("generated_documents", {
        template_id: template.id,
        template_name: template.name,
        employee_id: employee.id,
        employee_name: employee.full_name,
        company_name: company?.name ?? null,
        content:
          liq && liqCalc
            ? liquidacionText(liq, liqCalc)
            : nom && nomCalc
              ? nominaText(nom, nomCalc)
              : text,
      });
      await qc.invalidateQueries({ queryKey: qk.generated });
    } catch {
      /* el historial es informativo: no bloquea la generación */
    }
  };

  const guard = () => {
    if (!template || !employee) {
      toast.error("Selecciona el documento y el empleado.");
      return false;
    }
    return true;
  };

  const downloadPdf = () =>
    liq && liqCalc
      ? downloadLiquidacionPdf({ input: liq, calc: liqCalc, logoUrl: logo })
      : nom && nomCalc
        ? downloadNominaPdf({ input: nom, calc: nomCalc, logoUrl: logo })
        : downloadDocumentPdf({
          title: `${template!.name} — ${employee!.full_name}`,
          text,
          logoUrl: logo,
        });

  const validateLiq = () => {
    if (!liq) return false;
    if (!(liq.salario > 0)) {
      toast.error("Ingresa el salario básico mensual.");
      return false;
    }
    if (!liq.fechaIngreso || !liq.fechaHasta || liq.fechaHasta < liq.fechaIngreso) {
      toast.error("Revisa las fechas de ingreso y retiro.");
      return false;
    }
    return true;
  };

  const validateNom = () => {
    if (!nom) return false;
    if (!(nom.salario > 0) || !(nom.dias > 0)) {
      toast.error("Ingresa el salario y el número de días.");
      return false;
    }
    return true;
  };

  const generatePdf = async () => {
    if (!guard()) return;
    if (isLiq && !validateLiq()) return;
    if (isNom && !validateNom()) return;
    try {
      await downloadPdf();
    } catch {
      toast.error("No se pudo generar el PDF.");
      return;
    }
    await saveHistory();
    celebrate({
      variant: "goodjob",
      title: "¡Buen trabajo!",
      lines: [
        "PDF generado exitosamente",
        employee!.full_name,
        template!.name,
      ],
      actionLabel: "Ir a documentos",
      secondaryLabel: "Descargar de nuevo",
      onSecondary: () => {
        void downloadPdf();
      },
      duration: 3000,
      onDone: () => setTab("historial"),
    });
  };

  const toAutentic = async () => {
    if (!guard()) return;
    await generatePdf();
    window.open(AUTENTIC_URL, "_blank", "noopener");
  };

  const linkFor = (token: string) => `${window.location.origin}/firmar/${token}`;

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  };

  const share = async () => {
    if (!guard() || !liq || !liqCalc || !employee || !validateLiq()) return;
    setSharing(true);
    try {
      const { data, error } = await supabase
        .from("shared_liquidaciones")
        .insert({
          employee_id: employee.id,
          employee_name: employee.full_name,
          data: JSON.parse(JSON.stringify({ input: liq, calc: liqCalc })),
          logo_path: logoPath,
        })
        .select("token")
        .single();
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: qk.shared });
      setShareName(employee.full_name);
      setShareUrl(linkFor(data.token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el link");
    } finally {
      setSharing(false);
    }
  };

  const whatsappHref = (url: string, name: string) =>
    `https://wa.me/?text=${encodeURIComponent(
      `Hola ${name}, aquí puedes revisar y firmar tu liquidación: ${url}`,
    )}`;

  const downloadShared = async (s: SharedLiquidacion) => {
    try {
      const url = s.logo_path && !s.logo_path.endsWith(".pdf") ? await logoUrl(s.logo_path) : null;
      await downloadLiquidacionPdf({
        input: s.data.input,
        calc: s.data.calc,
        logoUrl: url,
        firma: s.firma,
      });
    } catch {
      toast.error("No se pudo generar el PDF.");
    }
  };

  const removeShared = async (id: string) => {
    try {
      await deleteRow("shared_liquidaciones", id);
      await qc.invalidateQueries({ queryKey: qk.shared });
      toast.success("Liquidación compartida eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const reprint = (content: string, title: string) => {
    void downloadDocumentPdf({ title, text: content, logoUrl: null });
  };

  const removeHistory = async (id: string) => {
    try {
      await deleteRow("generated_documents", id);
      await qc.invalidateQueries({ queryKey: qk.generated });
      toast.success("Registro eliminado del historial");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Crea documentos base en texto con variables y genera PDF con logo y datos del
            empleado.
          </p>
        </div>
        <Button variant="success" className="gap-2" onClick={openCreate}>
          <FilePlus2 className="size-4" /> Crear nuevo documento
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          if (v !== "generar") {
            setExtra("");
            setExtraPos("end");
          }
          setTab(v);
        }}
      >
        <TabsList>
          <TabsTrigger value="base">Documentos base</TabsTrigger>
          <TabsTrigger value="generar">Generar PDF</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="compartidas">Liquidaciones compartidas</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------ documentos base */}
        <TabsContent value="base" className="mt-4">
          {templates.length === 0 ? (
            <div className="rounded-xl border bg-surface p-8 text-center text-sm text-muted-foreground shadow-panel">
              Aún no hay documentos base. Crea el primero con “Crear nuevo documento”.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border bg-surface p-4 shadow-panel"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{t.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{categoryLabel(t.category)}</Badge>
                      <Badge variant="outline">{companyName(t.company_id)}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Creado: {t.created_at ? fmtDate(t.created_at.slice(0, 10)) : "—"}
                    </p>
                    {!t.body?.trim() && (
                      <p className="text-[11px] text-warning-foreground">
                        Plantilla del sistema: edítala para usar tu propio texto.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEdit(t)}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="success" className="gap-1.5" onClick={() => use(t)}>
                      <FileDown className="size-3.5" /> Usar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="gap-1.5 text-danger-foreground">
                          <Trash2 className="size-3.5" /> Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>⚠️ ¿Eliminar “{t.name}”?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se borra el documento base. Los PDF ya generados y su historial no se
                            modifican.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void remove(t)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------- generar */}
        <TabsContent value="generar" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
            <div className="space-y-4 rounded-xl border bg-surface p-5 shadow-panel">
              <div className="space-y-1.5">
                <Label>Documento</Label>
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {template?.name ?? "Elige “Usar” en un documento base"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emp-search">
                  Empleado <span className="text-danger-foreground">*</span>
                </Label>
                <Input
                  id="emp-search"
                  placeholder="Buscar por nombre o cédula…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
                  {visibleEmployees.length === 0 && (
                    <p className="px-2 py-3 text-xs text-muted-foreground">Sin resultados.</p>
                  )}
                  {visibleEmployees.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEmployeeId(e.id)}
                      className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${
                        employeeId === e.id ? "bg-accent font-medium" : ""
                      }`}
                    >
                      {e.full_name} — {e.cedula}
                    </button>
                  ))}
                </div>
              </div>

              {isLiq && liq ? (
                <>
                  <LiquidacionForm value={liq} onChange={setLiq} companies={companies} />
                </>
              ) : isNom && nom ? (
                <NominaForm value={nom} onChange={setNom} />
              ) : (
              <div className="space-y-1.5">
                <Label htmlFor="extra-text">Información adicional (temporal)</Label>
                <Textarea
                  id="extra-text"
                  rows={4}
                  placeholder="Escribe texto extra que se agregará solo a este documento…"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                />
                <Label htmlFor="extra-pos" className="pt-1">
                  ¿Dónde se agrega?
                </Label>
                <Select value={extraPos} onValueChange={setExtraPos}>
                  <SelectTrigger id="extra-pos">
                    <SelectValue placeholder="Elige la posición" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Al inicio del documento</SelectItem>
                    {lines.map((l, i) => (
                      <SelectItem key={i} value={String(i)}>
                        Después del renglón {i + 1}: {l.slice(0, 45)}…
                      </SelectItem>
                    ))}
                    <SelectItem value="end">Al final del documento</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Este texto se agrega en la posición elegida del documento que vas a generar y no
                  se guarda en el documento base; al salir desaparece.
                </p>
              </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="success" className="gap-2" onClick={() => void generatePdf()}>
                  <FileDown className="size-4" /> Descargar PDF
                </Button>
                {isLiq && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={sharing}
                    onClick={() => void share()}
                  >
                    <Share2 className="size-4" /> Compartir
                  </Button>
                )}
                <Button variant="outline" className="gap-2" onClick={() => void toAutentic()}>
                  <PenTool className="size-4" /> Enviar a Autentic
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => void generatePdf()}>
                  <Printer className="size-4" /> Imprimir
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-surface p-6 shadow-panel">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Previsualización
              </p>
              {logo && !isLiq && !isNom && (
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
              {isLiq && liq && liqCalc ? (
                <div className="mt-3">
                  <LiquidacionPreview
                    input={liq}
                    calc={liqCalc}
                    logo={logo}
                    companyName={liq.dependencia || undefined}
                  />
                </div>
              ) : isNom && nom && nomCalc ? (
                <div className="mt-3">
                  <NominaPreview input={nom} calc={nomCalc} logo={logo} />
                </div>
              ) : (
                <div className="mt-3 min-h-96">
                  {text ? (
                    <DocumentText text={text} />
                  ) : (
                    <p className="text-sm">
                      Selecciona un documento base y un empleado para ver el resultado.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ----------------------------------------------------- historial */}
        <TabsContent value="historial" className="mt-4">
          {history.length === 0 ? (
            <div className="rounded-xl border bg-surface p-8 text-center text-sm text-muted-foreground shadow-panel">
              Todavía no has generado documentos.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface p-4 shadow-panel"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{h.template_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.employee_name}
                      {h.company_name ? ` · ${h.company_name}` : ""} ·{" "}
                      {fmtDate(h.created_at.slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => reprint(h.content, `${h.template_name} — ${h.employee_name}`)}
                    >
                      <History className="size-3.5" /> Ver / descargar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-danger-foreground"
                      onClick={() => void removeHistory(h.id)}
                    >
                      <Trash2 className="size-3.5" /> Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------ liquidaciones compartidas */}
        <TabsContent value="compartidas" className="mt-4">
          {shared.length === 0 ? (
            <div className="rounded-xl border bg-surface p-8 text-center text-sm text-muted-foreground shadow-panel">
              Aún no has compartido liquidaciones. Usa “Compartir” al generar una liquidación.
            </div>
          ) : (
            <div className="space-y-2">
              {shared.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface p-4 shadow-panel"
                >
                  <div className="space-y-0.5">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {s.employee_name}
                      {s.signed_at ? (
                        <Badge variant="secondary">
                          Firmada · {fmtDate(s.signed_at.slice(0, 10))}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Compartida: {fmtDate(s.created_at.slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => void copyLink(linkFor(s.token))}
                    >
                      <Copy className="size-3.5" /> Copiar link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => void downloadShared(s)}
                    >
                      <FileDown className="size-3.5" /> Descargar PDF
                    </Button>
                    {!s.signed_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setEditingShared(s)}
                      >
                        <Pencil className="size-3.5" /> Editar
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="gap-1.5 text-danger-foreground">
                          <Trash2 className="size-3.5" /> Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ⚠️ ¿Eliminar la liquidación de {s.employee_name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            El link dejará de funcionar y se perderá la firma guardada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void removeShared(s.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SharedLiquidacionEditor
        shared={editingShared}
        onOpenChange={(o) => !o && setEditingShared(null)}
      />

      <Dialog open={!!shareUrl} onOpenChange={(o) => !o && setShareUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link para firmar</DialogTitle>
            <DialogDescription>
              Envía este link al trabajador. Solo verá su liquidación y podrá firmarla.
            </DialogDescription>
          </DialogHeader>
          <Input readOnly value={shareUrl ?? ""} onFocus={(e) => e.currentTarget.select()} />
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => shareUrl && void copyLink(shareUrl)}
            >
              <Copy className="size-4" /> Copiar link
            </Button>
            <Button type="button" variant="success" className="gap-2" asChild>
              <a
                href={shareUrl ? whatsappHref(shareUrl, shareName) : "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" /> Enviar por WhatsApp
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} template={editing} />
    </div>
  );
}
