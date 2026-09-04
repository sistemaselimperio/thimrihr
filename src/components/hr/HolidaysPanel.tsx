import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { qk, useHolidays, useReloadHolidays } from "@/lib/data";
import { fmtDate } from "@/lib/hr";

export function HolidaysPanel() {
  const { data: holidays = [] } = useHolidays();
  const reload = useReloadHolidays();
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const current = holidays.filter((h) => Number(h.year) === year);

  const addLocal = async () => {
    if (!date || !name.trim()) {
      toast.error("Indica la fecha y el nombre del festivo local.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("holidays")
      .upsert({ date, name: name.trim(), year: Number(date.slice(0, 4)), source: "local" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDate("");
    setName("");
    void qc.invalidateQueries({ queryKey: qk.holidays });
    toast.success("Festivo local agregado");
  };

  const removeLocal = async (day: string) => {
    const { error } = await supabase.from("holidays").delete().eq("date", day);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: qk.holidays });
  };

  return (
    <section className="space-y-2">
      <h2 className="font-display text-sm font-bold">Días festivos</h2>
      <div className="space-y-4 rounded-xl border bg-surface p-4 shadow-panel">
        <p className="text-sm text-muted-foreground">
          Los festivos se cargan automáticamente desde la base de datos oficial de Colombia y
          se excluyen (junto con los domingos) del cálculo de vacaciones, permisos,
          incapacidades y licencias.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">
            Festivos cargados: {current.length} ({year})
          </Badge>
          <span className="text-xs text-muted-foreground">
            Próxima actualización automática: 01/ene/{year + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={reload.isPending}
            onClick={() => reload.mutate([year, year + 1])}
          >
            <RefreshCw className={`size-4 ${reload.isPending ? "animate-spin" : ""}`} />
            Recargar desde Internet
          </Button>
        </div>

        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((h) => (
            <li key={h.date} className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="numeric text-muted-foreground">{fmtDate(h.date)}</span> — {h.name}
                {h.source === "local" && (
                  <span className="ml-1 text-xs text-muted-foreground">(local)</span>
                )}
              </span>
              {h.source === "local" && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar festivo local"
                  onClick={() => void removeLocal(h.date)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
          {!current.length && (
            <li className="text-sm text-muted-foreground">Aún no hay festivos cargados.</li>
          )}
        </ul>

        <div className="grid gap-3 border-t pt-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="hol-date">Festivo local (municipal)</Label>
            <Input
              id="hol-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hol-name">Nombre</Label>
            <Input
              id="hol-name"
              value={name}
              placeholder="Ej: Fiestas del municipio"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button variant="secondary" disabled={saving} onClick={() => void addLocal()}>
            Agregar festivo local
          </Button>
        </div>
      </div>
    </section>
  );
}
