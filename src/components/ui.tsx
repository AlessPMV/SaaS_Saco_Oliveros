"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, Loader2, Printer, X } from "lucide-react";

// ───────────── Modal (portal; se imprime solo el contenido del modal) ─────────────
export function Modal({ open, onClose, title, children, size = "md", footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; size?: "sm" | "md" | "lg" | "xl"; footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const ancho = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return createPortal(
    <div className="modal-root fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-panel my-4 w-full ${ancho} rounded-xl bg-white shadow-2xl`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-bold text-blue-950">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="no-print flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 rounded-b-xl">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ───────────── Toasts ─────────────
type Toast = { id: number; tipo: "ok" | "error" | "info"; texto: string };
const ToastCtx = createContext<{ ok: (t: string) => void; error: (t: string) => void; info: (t: string) => void }>({ ok: () => {}, error: () => {}, info: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tipo: Toast["tipo"], texto: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === "error" ? 7000 : 4500);
  }, []);
  const api = { ok: (t: string) => push("ok", t), error: (t: string) => push("error", t), info: (t: string) => push("info", t) };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm shadow-lg ${t.tipo === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : t.tipo === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}>
            {t.tipo === "ok" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : t.tipo === "error" ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <Info size={18} className="mt-0.5 shrink-0" />}
            <span>{t.texto}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ───────────── Piezas pequeñas ─────────────
export function Spinner({ texto = "Cargando…" }: { texto?: string }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} />{texto}</div>;
}

export function ErrorBox({ mensaje, onRetry }: { mensaje: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="flex items-center gap-2"><AlertCircle size={16} />{mensaje}</span>
      {onRetry && <button className="btn btn-sm btn-outline" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

export function Empty({ texto, icon }: { texto: string; icon?: ReactNode }) {
  return <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">{icon}{texto}</div>;
}

export function PageHeader({ titulo, subtitulo, acciones }: { titulo: string; subtitulo?: string; acciones?: ReactNode }) {
  return (
    <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-blue-950">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

const COLORES: Record<string, string> = {
  PAGADO: "bg-emerald-100 text-emerald-800", ACTIVA: "bg-emerald-100 text-emerald-800", MATRICULADO: "bg-emerald-100 text-emerald-800", ACTIVO: "bg-emerald-100 text-emerald-800", PRESENTE: "bg-emerald-100 text-emerald-800", EXITO: "bg-emerald-100 text-emerald-800",
  PENDIENTE: "bg-amber-100 text-amber-800", POSTULANTE: "bg-amber-100 text-amber-800", TARDANZA: "bg-amber-100 text-amber-800", ALERTA: "bg-amber-100 text-amber-800", EN_RIESGO: "bg-amber-100 text-amber-800",
  VENCIDO: "bg-red-100 text-red-800", ANULADA: "bg-red-100 text-red-800", RETIRADO: "bg-slate-200 text-slate-700", INACTIVO: "bg-slate-200 text-slate-700", FALTA_INJUSTIFICADA: "bg-red-100 text-red-800",
  FALTA_JUSTIFICADA: "bg-blue-100 text-blue-800", INFO: "bg-blue-100 text-blue-800",
};
const ETIQUETAS: Record<string, string> = {
  FALTA_INJUSTIFICADA: "Falta injustificada", FALTA_JUSTIFICADA: "Falta justificada", EN_RIESGO: "En riesgo",
  PAGADO: "Pagado", PENDIENTE: "Pendiente", VENCIDO: "Vencido", ACTIVA: "Activa", ANULADA: "Anulada",
  MATRICULADO: "Matriculado", POSTULANTE: "Postulante", RETIRADO: "Retirado", ACTIVO: "Activo", INACTIVO: "Inactivo",
  PRESENTE: "Presente", TARDANZA: "Tardanza", ALERTA: "Alerta", INFO: "Info", EXITO: "Éxito",
};
export function Badge({ valor, texto }: { valor: string; texto?: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORES[valor] ?? "bg-slate-100 text-slate-700"}`}>{texto ?? ETIQUETAS[valor] ?? valor}</span>;
}

export function Tabs<T extends string>({ tabs, activa, onChange }: { tabs: { id: T; label: string; icon?: ReactNode }[]; activa: T; onChange: (t: T) => void }) {
  return (
    <div className="no-print mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${activa === t.id ? "border-red-700 text-blue-950" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  );
}

export function StatCard({ titulo, valor, detalle, icon, color = "blue" }: { titulo: string; valor: ReactNode; detalle?: ReactNode; icon: ReactNode; color?: "blue" | "red" | "amber" | "green" }) {
  const c = { blue: "bg-blue-950 text-white", red: "bg-red-700 text-white", amber: "bg-amber-600 text-white", green: "bg-emerald-600 text-white" }[color];
  return (
    <div className="card flex items-start gap-4 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{valor}</p>
        {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
      </div>
    </div>
  );
}

export function Campo({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>;
}

export function Barra({ valor, max, color = "bg-blue-950" }: { valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>;
}

export function PrintButton({ texto = "Imprimir / Guardar PDF" }: { texto?: string }) {
  return <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} />{texto}</button>;
}
