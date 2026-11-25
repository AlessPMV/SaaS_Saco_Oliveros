import { badRequest } from "@/lib/api";

type OpcionesTexto = { min?: number; max?: number };

export function texto(v: unknown, campo: string, o: OpcionesTexto = {}): string {
  if (typeof v !== "string" || v.trim() === "") throw badRequest(`El campo «${campo}» es obligatorio.`);
  const t = v.trim();
  if (o.min && t.length < o.min) throw badRequest(`El campo «${campo}» debe tener al menos ${o.min} caracteres.`);
  if (o.max && t.length > o.max) throw badRequest(`El campo «${campo}» no debe exceder ${o.max} caracteres.`);
  return t;
}

export function textoOpc(v: unknown, campo: string, o: OpcionesTexto = {}): string | null {
  if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) return null;
  return texto(v, campo, o);
}

export function entero(v: unknown, campo: string, o: { min?: number; max?: number } = {}): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n)) throw badRequest(`El campo «${campo}» debe ser un número entero.`);
  if (o.min !== undefined && n < o.min) throw badRequest(`El campo «${campo}» debe ser mayor o igual a ${o.min}.`);
  if (o.max !== undefined && n > o.max) throw badRequest(`El campo «${campo}» debe ser menor o igual a ${o.max}.`);
  return n;
}

export function numero(v: unknown, campo: string, o: { min?: number; max?: number } = {}): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) throw badRequest(`El campo «${campo}» debe ser un número válido.`);
  if (o.min !== undefined && n < o.min) throw badRequest(`El campo «${campo}» debe ser mayor o igual a ${o.min}.`);
  if (o.max !== undefined && n > o.max) throw badRequest(`El campo «${campo}» debe ser menor o igual a ${o.max}.`);
  return n;
}

export function enumerado<T extends string>(v: unknown, campo: string, valores: readonly T[]): T {
  if (typeof v !== "string" || !(valores as readonly string[]).includes(v)) {
    throw badRequest(`El campo «${campo}» debe ser uno de: ${valores.join(", ")}.`);
  }
  return v as T;
}

export function dni(v: unknown, campo = "DNI"): string {
  const t = texto(v, campo);
  if (!/^\d{8}$/.test(t)) throw badRequest("El DNI debe tener exactamente 8 dígitos numéricos.");
  return t;
}

export function email(v: unknown, campo = "Correo electrónico"): string {
  const t = texto(v, campo).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) throw badRequest(`El campo «${campo}» no tiene un formato válido.`);
  return t;
}

export function fecha(v: unknown, campo: string): string {
  const t = texto(v, campo);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || isNaN(new Date(t + "T00:00:00").getTime())) {
    throw badRequest(`El campo «${campo}» debe tener el formato AAAA-MM-DD.`);
  }
  return t;
}

export function hora(v: unknown, campo: string): string {
  const t = texto(v, campo);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) throw badRequest(`El campo «${campo}» debe tener el formato HH:MM (24 h).`);
  return t;
}

export function telefono(v: unknown, campo = "Teléfono"): string {
  const t = texto(v, campo);
  if (!/^[0-9+\s()-]{7,15}$/.test(t)) throw badRequest(`El campo «${campo}» no es un teléfono válido.`);
  return t;
}
