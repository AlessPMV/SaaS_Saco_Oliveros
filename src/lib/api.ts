import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import type { Rol } from "@/lib/permissions";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (m: string) => new HttpError(400, m);
export const unauthorized = (m = "No autenticado. Inicie sesión para continuar.") => new HttpError(401, m);
export const forbidden = (m = "No tiene permisos para realizar esta acción.") => new HttpError(403, m);
export const notFound = (m = "Recurso no encontrado.") => new HttpError(404, m);
export const conflict = (m: string) => new HttpError(409, m);

export const created = (data: unknown) => NextResponse.json(data, { status: 201 });

type Handler<P> = (req: NextRequest, ctx: { params: P; user: SessionUser }) => Promise<unknown>;

/**
 * Envuelve un Route Handler con autenticación, control de acceso por rol (RBAC)
 * y manejo uniforme de errores HTTP (`{ error: "..." }`).
 * `roles`: lista de roles permitidos, o "publico" para rutas sin sesión.
 */
export function route<P = Record<string, never>>(roles: readonly Rol[] | "publico", handler: Handler<P>) {
  return async (req: NextRequest, ctx: { params: P }): Promise<Response> => {
    try {
      let user = null as SessionUser | null;
      if (roles !== "publico") {
        user = await getSessionUser();
        if (!user) throw unauthorized();
        if (!roles.includes(user.rol)) throw forbidden();
      }
      const resultado = await handler(req, { params: ctx?.params, user: user as SessionUser });
      if (resultado instanceof Response) return resultado;
      return NextResponse.json(resultado ?? { ok: true });
    } catch (e) {
      return manejarError(e);
    }
  };
}

export function manejarError(e: unknown): Response {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const campo = Array.isArray(e.meta?.target) ? (e.meta?.target as string[]).join(", ") : String(e.meta?.target ?? "");
      return NextResponse.json({ error: `Ya existe un registro con el mismo valor único${campo ? ` (${campo})` : ""}.` }, { status: 409 });
    }
    if (e.code === "P2025") return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
    if (e.code === "P2003") return NextResponse.json({ error: "La operación referencia un registro inexistente o con dependencias." }, { status: 409 });
  }
  console.error("[API] Error interno:", e);
  return NextResponse.json({ error: "Error interno del servidor. Intente nuevamente." }, { status: 500 });
}

export async function leerJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON válido.");
  }
}
