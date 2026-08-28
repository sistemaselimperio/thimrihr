import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { qk, updateRow } from "@/lib/data";
import { fmtDate, type Employee } from "@/lib/hr";

/** Renovación de contrato: permite mantener término fijo con nueva fecha o pasar a indefinido. */
export function RenewContractDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState("fijo");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setType(employee.contract_type ?? (employee.contract_end_date ? "fijo" : "indefinido"));
      setEndDate("");
    }
  }, [open, employee]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (type === "fijo" && !endDate) {
      toast.error("Si seleccionas Término fijo, debes ingresar la nueva fecha de fin");
      return;
    }
    setBusy(true);
    try {
      await updateRow("employees", employee.id, {
        contract_type: type,
        contract_end_date: type === "indefinido" ? null : endDate,
      });
      await qc.invalidateQueries({ queryKey: qk.employees });
      onOpenChange(false);
      toast.success("Contrato renovado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo renovar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renovar contrato</DialogTitle>
          <DialogDescription>
            {employee.full_name} · contrato actual vence el{" "}
            {employee.contract_end_date ? fmtDate(employee.contract_end_date) : "—"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Nuevo tipo de contrato <span className="text-danger-foreground">*</span>
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fijo">Término fijo</SelectItem>
                <SelectItem value="indefinido">Indefinido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="renew_end">
              Nueva fecha de fin
              {type === "fijo" && <span className="text-danger-foreground"> *</span>}
            </Label>
            <Input
              id="renew_end"
              type="date"
              disabled={type === "indefinido"}
              value={type === "indefinido" ? "" : endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {type === "indefinido"
                ? "— Sin fecha límite: la alerta de vencimiento desaparece."
                : "La alerta volverá a aparecer 40 días antes de esta fecha."}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Renovar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
