import { prisma } from "@/lib/prisma";
import { route, leerJson, notFound, conflict } from "@/lib/api";
import { ADMIN } from "@/lib/permissions";
import { validarCurso } from "@/lib/esquemas";

export const dynamic = "force-dynamic";

type P = { id: string };

export const PUT = route<P>(ADMIN, async (req, { params }) => {
  const datos = validarCurso(await leerJson(req));
  if (!(await prisma.curso.findUnique({ where: { id: params.id } }))) throw notFound("Curso no encontrado.");
  return prisma.curso.update({ where: { id: params.id }, data: datos });
});

export const DELETE = route<P>(ADMIN, async (_req, { params }) => {
  const c = await prisma.curso.findUnique({ where: { id: params.id }, include: { _count: { select: { horarios: true } } } });
  if (!c) throw notFound("Curso no encontrado.");
  if (c._count.horarios > 0) throw conflict("No se puede eliminar el curso porque está asignado en bloques horarios.");
  await prisma.curso.delete({ where: { id: params.id } });
  return { ok: true };
});
