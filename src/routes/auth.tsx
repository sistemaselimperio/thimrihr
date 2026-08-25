import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import portadaImperio from "@/assets/portada-imperio.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ingreso · imperiorrhco" },
      {
        name: "description",
        content:
          "Acceso privado al sistema de gestión de Recursos Humanos del Grupo El Imperio.",
      },
      { property: "og:title", content: "Ingreso · imperiorrhco" },
      {
        property: "og:description",
        content: "Acceso privado al sistema de Recursos Humanos del Grupo El Imperio.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const traducirError = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes("signups not allowed") || m.includes("signup is disabled"))
      return "El registro está cerrado. Solo las cuentas autorizadas pueden ingresar.";
    if (m.includes("email not confirmed"))
      return "Tu correo aún no está confirmado. Intenta de nuevo en unos segundos.";
    if (m.includes("invalid login credentials"))
      return "Correo o contraseña incorrectos.";
    if (m.includes("rate limit") || m.includes("after"))
      return "Demasiados intentos seguidos. Espera unos segundos e intenta otra vez.";
    return msg;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      void navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(
        error instanceof Error ? traducirError(error.message) : "No fue posible ingresar",
      );
    } finally {
      setBusy(false);
    }
  };





  return (
    <div className="grid min-h-screen grid-rows-[16rem_1fr] lg:grid-cols-[1.1fr_1fr] lg:grid-rows-1">
      <div
        className="relative flex flex-col justify-between bg-primary bg-cover bg-center bg-no-repeat lg:col-start-1"
        style={{ backgroundImage: `url(${portadaImperio.url})` }}
        aria-label="Portada Grupo Empresarial Imperio"
      >
        <div className="absolute inset-0 bg-primary/10" />
      </div>

      <div className="flex items-center justify-center bg-background p-8">
        <form
          onSubmit={(e) => void submit(e)}
          className="w-full max-w-sm space-y-5 rounded-xl border bg-surface p-8 shadow-panel"
        >
          <div className="flex items-center gap-2 text-brand">
            <ShieldCheck className="size-5" />
            <p className="font-display text-lg font-bold">Ingresar</p>

          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              Correo <span className="text-danger-foreground">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              Contraseña <span className="text-danger-foreground">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" variant="success" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Entrar
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Acceso solo para cuentas autorizadas. El registro está cerrado.
          </p>

        </form>
      </div>
    </div>
  );
}
