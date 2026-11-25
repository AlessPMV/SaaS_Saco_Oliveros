import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, leerJson, created } from "@/lib/api";
import { GESTION, TODOS } from "@/lib/permissions";
import { enumerado } from "@/lib/validators";
import { validarEstudiante } from "@/lib/esquemas";
import { siguienteCodigoEstudiante } from "@/lib/servicios";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const include = {
  apoderado: { select: { id: true, nombre: true, apellidos: true, email: true } },
  matriculas: { where: { estado: "ACTIVA" }, include: { seccion: true }, take: 1 },
} satisfies Prisma.EstudianteInclude;

export const GET = route(TODOS, async (req: NextRequest, { user }) => {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const estado = sp.get("estado");
  const seccionId = sp.get("seccionId");
  const where: Prisma.EstudianteWhereInput = {};
  if (user.rol === "APODERADO_ESTUDIANTE") where.usuarioApoderadoId = user.id;
  if (user.rol === "DOCENTE") where.estado = "MATRICULADO";
  if (q) where.OR = [{ nombres: { contains: q } }, { apellidos: { contains: q } }, { dni: { contains: q } }, { codigoEstudiante: { contains: q } }];
  if (estado) where.estado = estado;
  if (seccionId) where.matriculas = { some: { seccionId, estado: "ACTIVA" } };
  const estudiantes = await prisma.estudiante.findMany({ where, include, orderBy: { apellidos: "asc" } });
  return estudiantes;
});

export const POST = route(GESTION, async (req) => {
  const body = await leerJson(req);
  const datos = validarEstudiante(body);
  const estado = body.estado ? enumerado(body.estado, "Estado", ["POSTULANTE", "MATRICULADO", "RETIRADO"] as const) : "POSTULANTE";
  const estudiante = await prisma.$transaction(async (tx) => {
    const codigoEstudiante = await siguienteCodigoEstudiante(tx);
    return tx.estudiante.create({ data: { ...datos, codigoEstudiante, estado }, include });
  });
  return created(estudiante);
});
