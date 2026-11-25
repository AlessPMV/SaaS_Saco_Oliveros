import { jwtVerify } from "jose";
import type { Rol } from "@/lib/permissions";

export const SESSION_COOKIE = "so_session";

export interface TokenPayload {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  rol: Rol;
}

export async function verificarToken(token: string | undefined): Promise<TokenPayload | null> {
  if (!token) return null;
  try {
    const secreto = new TextEncoder().encode(process.env.JWT_SECRET ?? "saco-oliveros-huancayo-2026-secret");
    const { payload } = await jwtVerify(token, secreto);
    return {
      id: String(payload.id),
      nombre: String(payload.nombre),
      apellidos: String(payload.apellidos),
      email: String(payload.email),
      rol: payload.rol as Rol,
    };
  } catch {
    return null;
  }
}
