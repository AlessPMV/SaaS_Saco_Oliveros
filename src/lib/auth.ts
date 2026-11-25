import { SignJWT } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@/lib/permissions";

export { SESSION_COOKIE } from "@/lib/auth-edge";
import { SESSION_COOKIE, verificarToken } from "@/lib/auth-edge";
const DURACION_SEG = 60 * 60 * 8; // 8 horas

export interface SessionUser {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  rol: Rol;
}

function secreto(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "saco-oliveros-huancayo-2026-secret");
}

export async function crearToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEG}s`)
    .sign(secreto());
}

/** Obtiene la sesión desde la cookie HTTP-only y confirma en BD que el usuario siga activo. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const sesion = await verificarToken(token);
  if (!sesion) return null;
  const usuario = await prisma.usuario.findUnique({
    where: { id: sesion.id },
    select: { id: true, nombre: true, apellidos: true, email: true, rol: true, activo: true },
  });
  if (!usuario || !usuario.activo) return null;
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    email: usuario.email,
    rol: usuario.rol as Rol,
  };
}

export function establecerCookieSesion(res: { cookies: { set: (n: string, v: string, o: Record<string, unknown>) => void } }, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // sin SSL en el MVP local
    path: "/",
    maxAge: DURACION_SEG,
  });
}

export async function verificarPassword(plano: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}

export async function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, 10);
}
