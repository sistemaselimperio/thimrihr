import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Home,
  LayoutList,
  LogOut,
  Menu,
  MoreVertical,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompanies, useEmployees } from "@/lib/data";
import { activeFilterCount } from "@/lib/filters";
import { downloadSheet } from "@/lib/excel";
import { fmtDate } from "@/lib/hr";
import { useFilters } from "./filters-context";

const NAV = [
  { to: "/dashboard", label: "Principal", icon: Home },
  { to: "/empleados", label: "Empleados", icon: Users },
  { to: "/novedades", label: "Novedades", icon: LayoutList },
  { to: "/documentos", label: "Documentos", icon: FileText },
  { to: "/reportes", label: "Reportes", icon: Download },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

function Sidebar({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={[
        "flex shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        open ? "w-60" : "w-16",
      ].join(" ")}
    >
      <div className={["flex items-center py-6", open ? "px-5" : "justify-center px-2"].join(" ")}>
        {open ? (
          <div>
            <p className="font-display text-lg leading-none font-extrabold tracking-tight">
              El Imperio
            </p>
            <p className="mt-1.5 text-[11px] tracking-[0.18em] text-sidebar-foreground/60 uppercase">
              Recursos Humanos
            </p>
          </div>
        ) : (
          <p className="font-display text-xl font-extrabold tracking-tight" title="El Imperio RRHH">
            EI
          </p>
        )}
      </div>
      <nav className={["flex flex-1 flex-col gap-1", open ? "px-3" : "px-2"].join(" ")}>
        {NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={[
                "flex items-center rounded-md py-2.5 text-sm font-medium transition-colors",
                open ? "gap-3 px-3" : "justify-center px-2",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)]"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              ].join(" ")}
            >
              <item.icon className="size-4 shrink-0" />
              {open && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={open ? "Contraer menú" : "Expandir menú"}
          title={open ? "Contraer menú" : "Expandir menú"}
          className="w-full text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          {open ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </Button>
      </div>
      {open && (
        <div className="border-t border-sidebar-border px-5 py-4 text-[11px] text-sidebar-foreground/55">
          Grupo El Imperio · 5 empresas
        </div>
      )}
    </aside>
  );
}

const LOC_ALL = "__all_locations__";

function FiltersPopover() {
  const { filters, patch, reset } = useFilters();
  const { data: companies = [] } = useCompanies();
  const { data: employees = [] } = useEmployees();
  const count = activeFilterCount(filters);

  const locations = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of employees) {
      const loc = (e.work_location ?? "").trim();
      if (loc) set.set(loc.toLowerCase(), loc);
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b, "es"));
  }, [employees]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal className="size-4" />
          Filtros
          {count > 0 && (
            <Badge className="ml-1 h-5 min-w-5 justify-center bg-brand-light px-1 text-brand-foreground">
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Filtros avanzados</p>
          <Button variant="ghost" size="sm" onClick={reset}>
            Limpiar
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Empresa</Label>
          <Select value={filters.companyId} onValueChange={(v) => patch({ companyId: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Cargo contiene</Label>
          <Input
            value={filters.position}
            placeholder="Conductor, auxiliar…"
            onChange={(e) => patch({ position: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Lugar de trabajo</Label>
          <Select
            value={filters.workLocation || LOC_ALL}
            onValueChange={(v) => patch({ workLocation: v === LOC_ALL ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={LOC_ALL}>Todos los lugares</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Estado</Label>
          <Select
            value={filters.status}
            onValueChange={(v) => patch({ status: v as typeof filters.status })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="retirado">Retirados</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Ingreso desde</Label>
            <Input
              type="date"
              value={filters.hireFrom}
              onChange={(e) => patch({ hireFrom: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ingreso hasta</Label>
            <Input
              type="date"
              value={filters.hireTo}
              onChange={(e) => patch({ hireTo: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Vencimiento de contrato</Label>
          <Select
            value={filters.expiry}
            onValueChange={(v) => patch({ expiry: v as typeof filters.expiry })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin filtro</SelectItem>
              <SelectItem value="40">Vencen en próximos 40 días</SelectItem>
              <SelectItem value="30">Vencen en próximos 30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Novedad vigente hoy</Label>
          <Select
            value={filters.novelty}
            onValueChange={(v) => patch({ novelty: v as typeof filters.novelty })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin filtro</SelectItem>
              <SelectItem value="incapacidad">En incapacidad</SelectItem>
              <SelectItem value="permiso">Con permiso activo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TopBar({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const { filters, patch } = useFilters();
  const navigate = useNavigate();
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();

  const exportEmployees = () => {
    const names = new Map(companies.map((c) => [c.id, c.name]));
    downloadSheet("Empleados_El_Imperio.xlsx", "Empleados", [
      {
        title: "BASE DE EMPLEADOS — GRUPO EL IMPERIO",
        header: [
          "Cédula",
          "Nombre",
          "Empresa",
          "Cargo",
          "Ingreso",
          "Fin contrato",
          "Salida",
          "Celular",
          "Lugar de trabajo",
          "Horario",
          "Estado",
        ],
        rows: employees.map((e) => [
          e.cedula,
          e.full_name,
          e.company_id ? (names.get(e.company_id) ?? "") : "",
          e.position,
          fmtDate(e.hire_date),
          e.contract_end_date ? fmtDate(e.contract_end_date) : "Indefinido",
          e.exit_date ? fmtDate(e.exit_date) : "",
          e.phone ?? "",
          e.work_location ?? "",
          e.work_schedule ?? "",
          e.status === "activo" ? "Activo" : "Retirado",
        ]),
      },
    ]);
    toast.success("Base de empleados exportada a Excel");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-surface px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? "Contraer menú" : "Expandir menú"}
        title={sidebarOpen ? "Contraer menú" : "Expandir menú"}
        className="shrink-0 text-foreground/70 hover:bg-muted hover:text-foreground"
      >
        <Menu className="size-5" />
      </Button>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
          placeholder="Buscar por nombre, cédula o lugar de trabajo…"
          className="pl-9"
        />
      </div>

      <FiltersPopover />

      {filters.day && (
        <Button variant="secondary" className="gap-2" onClick={() => patch({ day: null })}>
          Día {fmtDate(filters.day)}
          <X className="size-3.5" />
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="success" className="gap-2">
          <Link to="/reportes">
            <Download className="size-4" />
            Reporte quincenal
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Menú de acciones">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => void navigate({ to: "/dashboard" })}>
              <Bell className="size-4" /> Ver alertas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void navigate({ to: "/configuracion" })}>
              <Settings className="size-4" /> Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="size-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
