import { prisma } from "@/lib/prisma";
import { route, leerJson, notFound, conflict } from "@/lib/api";
import { ADMIN } from "@/lib/permissions";
import { matriculadosActivos } from "@/lib/servicios";
import { validarSeccion } from "@/lib/esquemas";

export const dynamic = "force-dynamic";

type P = { id: string };

export const PUT = route<P>(ADMIN, async (req, { params }) => {
  const datos = validarSeccion(await leerJson(req));
  if (!(await prisma.seccion.findUnique({ where: { id: params.id } }))) throw notFound("Sección no encontrada.");
  const activos = await matriculadosActivos(prisma, params.id);
  if (datos.capacidadMaxima < activos) {
    throw conflict(`La capacidad máxima no puede ser menor a los ${activos} estudiantes matriculados actualmente.`);
  }
  return prisma.seccion.update({ where: { id: params.id }, data: datos });
});

export const DELETE = route<P>(ADMIN, async (_req, { params }) => {
  const s = await prisma.seccion.findUnique({ where: { id: params.id }, include: { _count: { select: { matriculas: true, horarios: true, asistencias: true } } } });
  if (!s) throw notFound("Sección no encontrada.");
  if (s._count.matriculas + s._count.horarios + s._count.asistencias > 0) {
    throw conflict("No se puede eliminar la sección porque tiene matrículas, horarios o asistencias registradas.");
  }
  await prisma.seccion.delete({ where: { id: params.id } });
  return { ok: true };
});
