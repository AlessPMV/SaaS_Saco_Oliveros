import { prisma } from "@/lib/prisma";
import { route, leerJson, badRequest } from "@/lib/api";
import { ROLES } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const GET = route(ROLES, async (_req, { user }) => {
  const [items, noLeidas] = await Promise.all([
    prisma.notificacion.findMany({ where: { usuarioId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.notificacion.count({ where: { usuarioId: user.id, leida: false } }),
  ]);
  return { items, noLeidas };
});

/** Marca una notificación (`{ id }`) o todas (`{ todas: true }`) como leídas. */
export const PATCH = route(ROLES, async (req, { user }) => {
  const body = await leerJson(req);
  if (body.todas === true) {
    const r = await prisma.notificacion.updateMany({ where: { usuarioId: user.id, leida: false }, data: { leida: true } });
    return { ok: true, actualizadas: r.count };
  }
  if (typeof body.id !== "string") throw badRequest("Indique la notificación a marcar como leída.");
  const r = await prisma.notificacion.updateMany({ where: { id: body.id, usuarioId: user.id }, data: { leida: true } });
  return { ok: true, actualizadas: r.count };
});
