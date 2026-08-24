import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
  const [mode, setMode] = useState<"login" | "signup">("login");
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
    if (m.includes("email not confirmed"))
      return "Tu correo aún no está confirmado. Intenta de nuevo en unos segundos.";
    if (m.includes("invalid login credentials"))
      return "Correo o contraseña incorrectos.";
    if (m.includes("already registered") || m.includes("already been registered"))
      return "Ese correo ya está registrado. Ingresa con tu contraseña.";
    if (m.includes("weak") || m.includes("known to be weak"))
      return "Esa contraseña es muy común. Usa una más segura.";
    if (m.includes("at least 6")) return "La contraseña debe tener al menos 6 caracteres.";
    if (m.includes("rate limit") || m.includes("after"))
      return "Demasiados intentos seguidos. Espera unos segundos e intenta otra vez.";
    return msg;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          toast.success("Cuenta creada. Ya puedes ingresar.");
          setMode("login");
        } else {
          toast.success("Cuenta creada. Bienvenida.");
          void navigate({ to: "/dashboard" });
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? traducirError(error.message) : "No fue posible ingresar",
      );
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div>
          <p className="font-display text-3xl font-extrabold tracking-tight">El Imperio</p>
          <p className="mt-2 text-sm tracking-[0.2em] text-sidebar-foreground/60 uppercase">
            Recursos Humanos
          </p>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-4xl leading-tight font-bold">
            Toda la información de tu gente, en un solo lugar.
          </h1>
          <p className="text-sm text-sidebar-foreground/70">
            Empleados, novedades, vacaciones, quincenas y reportes de nómina de las 5
            empresas del grupo, con cálculos automáticos.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          Acceso restringido · Información confidencial
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-8">
        <form
          onSubmit={(e) => void submit(e)}
          className="w-full max-w-sm space-y-5 rounded-xl border bg-surface p-8 shadow-panel"
        >
          <div className="flex items-center gap-2 text-brand">
            <ShieldCheck className="size-5" />
            <p className="font-display text-lg font-bold">
              {mode === "login" ? "Ingresar" : "Crear cuenta de administrador"}
            </p>
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" variant="success" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>

          <button
            type="button"
            className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login"
              ? "Primera vez: crear la cuenta de administrador"
              : "Ya tengo cuenta, quiero ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
