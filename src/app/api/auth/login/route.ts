import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearToken, establecerCookieSesion, verificarPassword } from "@/lib/auth";
import { manejarError, leerJson, badRequest, unauthorized, forbidden } from "@/lib/api";
import type { Rol } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await leerJson(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) throw badRequest("Ingrese su correo electrónico y contraseña.");

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !(await verificarPassword(password, usuario.password))) {
      throw unauthorized("Correo o contraseña incorrectos.");
    }
    if (!usuario.activo) throw forbidden("Su cuenta se encuentra desactivada. Comuníquese con la administración.");

    const user = { id: usuario.id, nombre: usuario.nombre, apellidos: usuario.apellidos, email: usuario.email, rol: usuario.rol as Rol };
    const token = await crearToken(user);
    const res = NextResponse.json({ user });
    establecerCookieSesion(res, token);
    return res;
  } catch (e) {
    return manejarError(e);
  }
}
