import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { leerJson, badRequest, conflict, notFound } from "@/lib/api";
import { DIAS } from "@/lib/utils";
import { enumerado, hora, texto } from "@/lib/validators";
import { detectarCruceHorario } from "@/lib/servicios";

/** Crea o edita un bloque horario aplicando la detección automática de cruces (docente y sección). */
export async function guardarHorario(req: NextRequest, id?: string) {
  const body = await leerJson(req);
  const datos = {
    seccionId: texto(body.seccionId, "Sección"),
    cursoId: texto(body.cursoId, "Curso"),
    docenteId: texto(body.docenteId, "Docente"),
    diaSemana: enumerado(body.diaSemana, "Día de la semana", DIAS),
    horaInicio: hora(body.horaInicio, "Hora de inicio"),
    horaFin: hora(body.horaFin, "Hora de fin"),
    aula: texto(body.aula, "Aula", { max: 30 }),
  };
  if (datos.horaInicio >= datos.horaFin) throw badRequest("La hora de inicio debe ser anterior a la hora de fin.");

  if (id && !(await prisma.horario.findUnique({ where: { id } }))) throw notFound("Bloque horario no encontrado.");
  const [seccion, curso, docente] = await Promise.all([
    prisma.seccion.findUnique({ where: { id: datos.seccionId } }),
    prisma.curso.findUnique({ where: { id: datos.cursoId } }),
    prisma.docente.findUnique({ where: { id: datos.docenteId } }),
  ]);
  if (!seccion) throw notFound("La sección seleccionada no existe.");
  if (!curso) throw notFound("El curso seleccionado no existe.");
  if (!docente) throw notFound("El docente seleccionado no existe.");
  if (docente.estado !== "ACTIVO") throw conflict("El docente seleccionado se encuentra inactivo.");

  const cruce = await detectarCruceHorario(datos, id);
  if (cruce) throw conflict(cruce);

  const include = { curso: true, docente: true, seccion: true };
  return id
    ? prisma.horario.update({ where: { id }, data: datos, include })
    : prisma.horario.create({ data: datos, include });
}
