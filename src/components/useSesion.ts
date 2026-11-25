"use client";

import { useApi } from "@/lib/client";
import type { Rol } from "@/lib/permissions";

export interface SesionCliente { id: string; nombre: string; apellidos: string; email: string; rol: Rol }

/** Devuelve el usuario autenticado (o null mientras carga). */
export function useSesion(): SesionCliente | null {
  const { data } = useApi<{ user: SesionCliente }>("/api/auth/session");
  return data?.user ?? null;
}
