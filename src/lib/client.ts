"use client";

import { useCallback, useEffect, useState } from "react";

export async function api<T = unknown>(url: string, init?: Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit }): Promise<T> {
  const { json, ...resto } = init ?? {};
  const headers = new Headers(resto.headers);
  let body = resto.body;
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }
  const res = await fetch(url, { ...resto, headers, body, cache: "no-store" });
  const texto = await res.text();
  let datos: unknown = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { /* respuesta no JSON */ }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/login")) window.location.href = "/login";
    const msg = (datos as { error?: string } | null)?.error ?? `Error ${res.status}: no se pudo completar la operación.`;
    throw new Error(msg);
  }
  return datos as T;
}

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) { setData(null); setLoading(false); return; }
    let cancelado = false;
    setLoading(true);
    api<T>(url)
      .then((d) => { if (!cancelado) { setData(d); setError(null); } })
      .catch((e: Error) => { if (!cancelado) setError(e.message); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

export function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = "\uFEFF" + filas.map((f) => f.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
