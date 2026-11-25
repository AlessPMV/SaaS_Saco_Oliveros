import { prisma } from "@/lib/prisma";
import { route, leerJson, created, notFound, conflict, badRequest } from "@/lib/api";
import { GESTION } from "@/lib/permissions";
import { texto, textoOpc } from "@/lib/validators";
import { validarEstudiante } from "@/lib/esquemas";
import {
  generarCargosMatricula,
  matriculadosActivos,
  notificar,
  siguienteCodigoEstudiante,
  siguienteCodigoMatricula,
} from "@/lib/servicios";
import { nombreSeccion } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = route([...GESTION, "APODERADO_ESTUDIANTE"], async (req, { user }) => {
  const sp = req.nextUrl.searchParams;
  const where: Prisma.MatriculaWhereInput = {};
  if (sp.get("seccionId")) where.seccionId = sp.get("seccionId")!;
  if (sp.get("estudianteId")) where.estudianteId = sp.get("estudianteId")!;
  if (sp.get("estado")) where.estado = sp.get("estado")!;
  if (user.rol === "APODERADO_ESTUDIANTE") where.estudiante = { usuarioApoderadoId: user.id };
  const q = sp.get("q")?.trim();
  if (q) {
    where.OR = [
      { codigoMatricula: { contains: q } },
      { estudiante: { nombres: { contains: q } } },
      { estudiante: { apellidos: { contains: q } } },
      { estudiante: { dni: { contains: q } } },
    ];
  }
  return prisma.matricula.findMany({
    where,
    include: { estudiante: true, seccion: true },
    orderBy: { fechaMatricula: "desc" },
  });
});

/**
 * Registro de matrícula. Regla crítica: control estricto de vacantes (sin sobrecupo).
 * Se acepta `estudianteId` (postulante existente) o `estudiante` (datos de un nuevo postulante).
 */
export const POST = route(GESTION, async (req, { user }) => {
  const body = await leerJson(req);
  const seccionId = texto(body.seccionId, "Sección");
  const observaciones = textoOpc(body.observaciones, "Observaciones", { max: 300 });
  const estudianteId = typeof body.estudianteId === "string" && body.estudianteId ? body.estudianteId : null;
  if (!estudianteId && (typeof body.estudiante !== "object" || body.estudiante === null)) {
    throw badRequest("Seleccione un postulante existente o registre los datos de un nuevo postulante.");
  }
  const datosNuevo = estudianteId ? null : validarEstudiante(body.estudiante as Record<string, unknown>);

  const resultado = await prisma.$transaction(async (tx) => {
    const seccion = await tx.seccion.findUnique({ where: { id: seccionId } });
    if (!seccion) throw notFound("La sección seleccionada no existe.");

    // 1) Control de vacantes
    const activos = await matriculadosActivos(tx, seccion.id);
    if (activos >= seccion.capacidadMaxima) throw conflict("No existen vacantes disponibles en la sección seleccionada");

    // 2) Estudiante
    let estudiante;
    if (estudianteId) {
      estudiante = await tx.estudiante.findUnique({ where: { id: estudianteId } });
      if (!estudiante) throw notFound("El estudiante seleccionado no existe.");
      const yaActiva = await tx.matricula.findFirst({ where: { estudianteId, estado: "ACTIVA" } });
      if (yaActiva) throw conflict("El estudiante ya cuenta con una matrícula activa. Anule la anterior antes de registrar una nueva.");
    } else {
      const codigoEstudiante = await siguienteCodigoEstudiante(tx);
      estudiante = await tx.estudiante.create({ data: { ...datosNuevo!, codigoEstudiante, estado: "POSTULANTE" } });
    }

    // 3) Matrícula, estado del estudiante y cargos de pago
    const codigoMatricula = await siguienteCodigoMatricula(tx);
    const matricula = await tx.matricula.create({
      data: { codigoMatricula, estudianteId: estudiante.id, seccionId: seccion.id, observaciones },
      include: { estudiante: true, seccion: true },
    });
    await tx.estudiante.update({ where: { id: estudiante.id }, data: { estado: "MATRICULADO" } });
    const cargos = await generarCargosMatricula(tx, estudiante.id, seccion);

    // 4) Notificaciones internas
    const destinatarios = [user.id];
    if (estudiante.usuarioApoderadoId) destinatarios.push(estudiante.usuarioApoderadoId);
    await notificar(
      tx,
      destinatarios,
      "Matrícula registrada",
      `${estudiante.nombres} ${estudiante.apellidos} fue matriculado en ${nombreSeccion(seccion)} (${codigoMatricula}). Se generaron ${cargos.length} cargos de pago.`,
      "EXITO"
    );
    return { matricula, cargos };
  });

  return created(resultado);
});
