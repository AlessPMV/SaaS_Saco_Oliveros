"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api, useApi } from "@/lib/client";
import type { Notificacion } from "@/lib/tipos";
import { formatFechaHora } from "@/lib/utils";
import { Badge } from "@/components/ui";

export function NotificationBell() {
  const { data, reload } = useApi<{ items: Notificacion[]; noLeidas: number }>("/api/notificaciones");
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(reload, 30000);
    return () => clearInterval(t);
  }, [reload]);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  async function marcar(id: string) {
    await api("/api/notificaciones", { method: "PATCH", json: { id } }).catch(() => undefined);
    reload();
  }
  async function marcarTodas() {
    await api("/api/notificaciones", { method: "PATCH", json: { todas: true } }).catch(() => undefined);
    reload();
  }

  const noLeidas = data?.noLeidas ?? 0;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setAbierto((a) => !a); reload(); }} className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label="Notificaciones">
        <Bell size={20} />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-[11px] font-bold text-white">{noLeidas > 99 ? "99+" : noLeidas}</span>
        )}
      </button>
      {abierto && (
        <div className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-bold text-blue-950">Notificaciones</p>
            {noLeidas > 0 && <button onClick={marcarTodas} className="flex items-center gap-1 text-xs font-semibold text-blue-950 hover:underline"><CheckCheck size={14} /> Marcar todas como leídas</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(data?.items ?? []).length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No tiene notificaciones.</p>}
            {(data?.items ?? []).map((n) => (
              <button key={n.id} onClick={() => !n.leida && marcar(n.id)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${n.leida ? "opacity-60" : "bg-blue-50/40"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{n.titulo}</p>
                  <Badge valor={n.tipo} />
                </div>
                <p className="mt-1 text-xs text-slate-600">{n.mensaje}</p>
                <p className="mt-1 text-[11px] text-slate-400">{formatFechaHora(n.createdAt)}{!n.leida && " · Clic para marcar como leída"}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
