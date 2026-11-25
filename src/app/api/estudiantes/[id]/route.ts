import { prisma } from "@/lib/prisma";
import { route, leerJson, notFound, forbidden, conflict } from "@/lib/api";
import { GESTION, TODOS } from "@/lib/permissions";
import { enumerado } from "@/lib/validators";
import { validarEstudiante } from "@/lib/esquemas";

export const dynamic = "force-dynamic";

type P = { id: string };

export const GET = route<P>(TODOS, async (_req, { params, user }) => {
  const e = await prisma.estudiante.findUnique({
    where: { id: params.id },
    include: { apoderado: { select: { id: true, nombre: true, apellidos: true, email: true } }, matriculas: { include: { seccion: true }, orderBy: { fechaMatricula: "desc" } } },
  });
  if (!e) throw notFound("Estudiante no encontrado.");
  if (user.rol === "APODERADO_ESTUDIANTE" && e.usuarioApoderadoId !== user.id) throw forbidden("Este estudiante no está vinculado a su cuenta.");
  return e;
});

export const PUT = route<P>(GESTION, async (req, { params }) => {
  const body = await leerJson(req);
  const datos = validarEstudiante(body);
  const estado = body.estado ? enumerado(body.estado, "Estado", ["POSTULANTE", "MATRICULADO", "RETIRADO"] as const) : undefined;
  const existe = await prisma.estudiante.findUnique({ where: { id: params.id } });
  if (!existe) throw notFound("Estudiante no encontrado.");
  return prisma.estudiante.update({ where: { id: params.id }, data: { ...datos, ...(estado ? { estado } : {}) } });
});

export const DELETE = route<P>(GESTION, async (_req, { params }) => {
  const e = await prisma.estudiante.findUnique({ where: { id: params.id }, include: { _count: { select: { matriculas: true, pagos: true, asistencias: true, documentos: true } } } });
  if (!e) throw notFound("Estudiante no encontrado.");
  const c = e._count;
  if (c.matriculas + c.pagos + c.asistencias + c.documentos > 0) {
    throw conflict("No se puede eliminar al estudiante porque tiene matrículas, pagos, asistencias o documentos registrados. Cambie su estado a «Retirado» en su lugar.");
  }
  await prisma.estudiante.delete({ where: { id: params.id } });
  return { ok: true };
});
