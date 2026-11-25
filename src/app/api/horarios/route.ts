import { prisma } from "@/lib/prisma";
import { route, created } from "@/lib/api";
import { TODOS } from "@/lib/permissions";
import { seccionesDelApoderado } from "@/lib/servicios";
import type { Prisma } from "@prisma/client";
import { guardarHorario } from "@/lib/horarios";

export const dynamic = "force-dynamic";

export const GET = route(TODOS, async (req, { user }) => {
  const sp = req.nextUrl.searchParams;
  const where: Prisma.HorarioWhereInput = {};
  if (sp.get("seccionId")) where.seccionId = sp.get("seccionId")!;
  if (sp.get("docenteId")) where.docenteId = sp.get("docenteId")!;
  if (user.rol === "DOCENTE") {
    const d = await prisma.docente.findUnique({ where: { usuarioId: user.id } });
    where.docenteId = d?.id ?? "__ninguno__";
  } else if (user.rol === "APODERADO_ESTUDIANTE") {
    const ids = await seccionesDelApoderado(user.id);
    where.seccionId = sp.get("seccionId") && ids.includes(sp.get("seccionId")!) ? sp.get("seccionId")! : { in: ids };
  }
  return prisma.horario.findMany({
    where,
    include: { curso: true, docente: true, seccion: true },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });
});

export const POST = route(["ADMINISTRADOR"], async (req) => created(await guardarHorario(req)));
