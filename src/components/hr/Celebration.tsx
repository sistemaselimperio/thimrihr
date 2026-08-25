import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export type CelebrationDetail = { label: string; value: string };

export type CelebrationOptions = {
  title: string;
  /** "success" = check verde/fondo azul (empleados). "goodjob" = carita feliz/fondo púrpura (documentos). */
  variant?: "success" | "goodjob";
  /** Líneas de texto simples (usadas en la variante "goodjob") */
  lines?: string[];
  /** Botón secundario opcional (ej. "Descargar") */
  secondaryLabel?: string;
  onSecondary?: () => void;
  details?: CelebrationDetail[];
  actionLabel?: string;
  /** Confetti más intenso para eventos grandes (crear empleado, importar) */
  intensity?: "normal" | "high" | "max";
  /** Milisegundos antes del cierre automático */
  duration?: number;
  /** Se ejecuta al cerrar (auto o manual) */
  onDone?: () => void;
};

const CelebrationContext = createContext<(options: CelebrationOptions) => void>(() => {});

export function useCelebration() {
  return useContext(CelebrationContext);
}

const COLORS = [
  "#ff4444",
  "#ff9944",
  "#ffdd44",
  "#4488ff",
  "#44dd44",
  "#ff44aa",
  "#aa44ff",
];
const SHAPES = ["★", "♥", "■", "●", "◆", "~"];

type Piece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  shape: string;
  drift: number;
};

function buildPieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 2.2,
    duration: 3.6 + Math.random() * 2.6,
    size: 12 + Math.random() * 14,
    color: COLORS[i % COLORS.length]!,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)]!,
    drift: Math.random() * 80 - 40,
  }));
}

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CelebrationOptions | null>(null);
  const doneRef = useRef<(() => void) | undefined>(undefined);

  const celebrate = useCallback((options: CelebrationOptions) => {
    doneRef.current = options.onDone;
    setState(options);
  }, []);

  const close = useCallback(() => {
    setState(null);
    const done = doneRef.current;
    doneRef.current = undefined;
    done?.();
  }, []);

  useEffect(() => {
    if (!state) return;
    const ms = state.duration ?? (state.intensity === "max" ? 3600 : state.intensity === "high" ? 2800 : 2400);
    const timer = window.setTimeout(close, ms);
    return () => window.clearTimeout(timer);
  }, [state, close]);

  const pieces = useMemo(() => {
    if (!state) return [];
    const count = state.intensity === "max" ? 90 : state.intensity === "high" ? 60 : 38;
    return buildPieces(count);
  }, [state]);

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      {state && (
        <div
          role="status"
          aria-live="polite"
          onClick={close}
          className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden px-4 animate-fade-in ${
            state.variant === "goodjob" ? "bg-[#6b5b95]/95" : "bg-primary/95"
          }`}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {pieces.map((piece, index) => (
              <span
                key={index}
                className="confetti-piece"
                style={{
                  left: `${piece.left}%`,
                  color: piece.color,
                  fontSize: `${piece.size}px`,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                  ["--confetti-drift" as string]: `${piece.drift}px`,
                }}
              >
                {piece.shape}
              </span>
            ))}
          </div>

          {state.variant === "goodjob" ? (
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-md px-6 text-center"
            >
              <div className="celebration-avatar mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-[#a78bfa] text-6xl shadow-2xl">
                <span aria-hidden>😊</span>
              </div>

              <div className="celebration-text">
                <h2 className="mt-8 text-4xl font-bold text-white drop-shadow">
                  {state.title}
                </h2>

                {state.lines && state.lines.length > 0 && (
                  <div className="mt-4 space-y-1 text-base text-white/85">
                    {state.lines.map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  {state.secondaryLabel && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        state.onSecondary?.();
                        close();
                      }}
                    >
                      {state.secondaryLabel}
                    </Button>
                  )}
                  <Button
                    onClick={close}
                    className="bg-success text-primary-foreground hover:bg-success/90"
                  >
                    {state.actionLabel ?? "Continuar"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-2xl animate-scale-in"
            >
              <div className="celebration-check mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-success">
                <Check className="h-14 w-14 text-primary-foreground" strokeWidth={3} />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-primary">{state.title}</h2>

              {state.details && state.details.length > 0 && (
                <dl className="mt-4 space-y-1 text-sm text-muted-foreground">
                  {state.details.map((detail) => (
                    <div key={detail.label} className="flex justify-center gap-1.5">
                      <dt className="font-medium text-foreground">{detail.label}:</dt>
                      <dd>{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <Button onClick={close} className="mt-6 w-full bg-success hover:bg-success/90">
                {state.actionLabel ?? "Continuar"}
              </Button>
            </div>
          )}
        </div>
      )}
    </CelebrationContext.Provider>
  );
}
