import { prisma } from "@/lib/prisma";
import { route, notFound } from "@/lib/api";
import { guardarHorario } from "@/lib/horarios";

export const dynamic = "force-dynamic";

type P = { id: string };

export const PUT = route<P>(["ADMINISTRADOR"], async (req, { params }) => guardarHorario(req, params.id));

export const DELETE = route<P>(["ADMINISTRADOR"], async (_req, { params }) => {
  if (!(await prisma.horario.findUnique({ where: { id: params.id } }))) throw notFound("Bloque horario no encontrado.");
  await prisma.horario.delete({ where: { id: params.id } });
  return { ok: true };
});
