import { prisma } from "@/lib/prisma";
import { route, leerJson, notFound, conflict } from "@/lib/api";
import { ADMIN } from "@/lib/permissions";
import { validarDocente } from "@/lib/esquemas";

export const dynamic = "force-dynamic";

type P = { id: string };

export const PUT = route<P>(ADMIN, async (req, { params }) => {
  const body = await leerJson(req);
  const datos = validarDocente(body);
  if (!(await prisma.docente.findUnique({ where: { id: params.id } }))) throw notFound("Docente no encontrado.");
  return prisma.docente.update({ where: { id: params.id }, data: datos });
});

export const DELETE = route<P>(ADMIN, async (_req, { params }) => {
  const d = await prisma.docente.findUnique({ where: { id: params.id }, include: { _count: { select: { horarios: true } } } });
  if (!d) throw notFound("Docente no encontrado.");
  if (d._count.horarios > 0) throw conflict("No se puede eliminar al docente porque tiene bloques horarios asignados. Elimine sus horarios o márquelo como «Inactivo».");
  await prisma.docente.delete({ where: { id: params.id } });
  return { ok: true };
});
