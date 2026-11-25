import { prisma } from "@/lib/prisma";
import { route, leerJson, badRequest, forbidden, notFound } from "@/lib/api";
import { ROLES } from "@/lib/permissions";
import { enumerado, fecha, texto, textoOpc } from "@/lib/validators";
import { ESTADOS_ASISTENCIA, fechaISO, nombreSeccion } from "@/lib/utils";
import { estudiantesDelApoderado, idsPorRol, notificar, seccionesDelDocente } from "@/lib/servicios";

export const dynamic = "force-dynamic";

const CUENTAS = { PRESENTE: 0, TARDANZA: 0, FALTA_INJUSTIFICADA: 0, FALTA_JUSTIFICADA: 0 };

async function validarAccesoSeccion(rol: string, userId: string, seccionId: string) {
  if (rol === "DOCENTE") {
    const mias = await seccionesDelDocente(userId);
    if (!mias.includes(seccionId)) throw forbidden("Usted no tiene asignada esta sección en su horario.");
  }
}

export const GET = route(ROLES, async (req, { user }) => {
  const sp = req.nextUrl.searchParams;
  const vista = sp.get("vista") ?? "registro";

  // ── Portal familiar: resumen de asistencias e inasistencias de sus estudiantes
  if (user.rol === "APODERADO_ESTUDIANTE") {
    const ids = await estudiantesDelApoderado(user.id);
    const estudiantes = await prisma.estudiante.findMany({
      where: { id: { in: ids } },
      include: { asistencias: { orderBy: { fecha: "desc" }, include: { seccion: true } } },
      orderBy: { apellidos: "asc" },
    });
    return estudiantes.map((e) => {
      const c = { ...CUENTAS };
      e.asistencias.forEach((a) => (c[a.estado as keyof typeof CUENTAS] += 1));
      const total = e.asistencias.length;
      return {
        id: e.id, nombres: e.nombres, apellidos: e.apellidos, codigoEstudiante: e.codigoEstudiante,
        total, ...c,
        porcentaje: total ? Math.round(((c.PRESENTE + c.TARDANZA) / total) * 1000) / 10 : null,
        ultimos: e.asistencias.slice(0, 15).map((a) => ({ fecha: a.fecha, estado: a.estado, observacion: a.observacion, seccion: nombreSeccion(a.seccion) })),
      };
    });
  }

  const seccionId = sp.get("seccionId");

  // ── Reporte acumulado de inasistencias por estudiante
  if (vista === "reporte") {
    const mias = user.rol === "DOCENTE" ? await seccionesDelDocente(user.id) : null;
    if (seccionId) await validarAccesoSeccion(user.rol, user.id, seccionId);
    const matriculas = await prisma.matricula.findMany({
      where: { estado: "ACTIVA", ...(seccionId ? { seccionId } : mias ? { seccionId: { in: mias } } : {}) },
      include: { estudiante: { include: { asistencias: true } }, seccion: true },
    });
    return matriculas
      .map((m) => {
        const c = { ...CUENTAS };
        m.estudiante.asistencias.filter((a) => a.seccionId === m.seccionId).forEach((a) => (c[a.estado as keyof typeof CUENTAS] += 1));
        return {
          estudianteId: m.estudianteId, codigoEstudiante: m.estudiante.codigoEstudiante,
          nombres: m.estudiante.nombres, apellidos: m.estudiante.apellidos,
          seccionId: m.seccionId, seccion: nombreSeccion(m.seccion), ...c,
          alerta: c.FALTA_INJUSTIFICADA >= 3,
        };
      })
      .sort((a, b) => b.FALTA_INJUSTIFICADA - a.FALTA_INJUSTIFICADA || a.apellidos.localeCompare(b.apellidos));
  }

  // ── Registro diario: estudiantes matriculados de la sección + asistencia de la fecha
  if (!seccionId) throw badRequest("Seleccione una sección.");
  const f = fecha(sp.get("fecha") ?? fechaISO(), "Fecha");
  await validarAccesoSeccion(user.rol, user.id, seccionId);
  const seccion = await prisma.seccion.findUnique({ where: { id: seccionId } });
  if (!seccion) throw notFound("Sección no encontrada.");
  const matriculas = await prisma.matricula.findMany({
    where: { seccionId, estado: "ACTIVA" },
    include: { estudiante: true },
    orderBy: { estudiante: { apellidos: "asc" } },
  });
  const registros = await prisma.asistencia.findMany({ where: { seccionId, fecha: f } });
  const faltas = await prisma.asistencia.groupBy({
    by: ["estudianteId"],
    where: { seccionId, estado: "FALTA_INJUSTIFICADA", fecha: { gte: `${f.slice(0, 4)}-01-01`, lte: `${f.slice(0, 4)}-12-31` } },
    _count: { _all: true },
  });
  const mapaFaltas = new Map(faltas.map((x) => [x.estudianteId, x._count._all]));
  return {
    seccion: { id: seccion.id, nombre: nombreSeccion(seccion) },
    fecha: f,
    estudiantes: matriculas.map((m) => {
      const r = registros.find((x) => x.estudianteId === m.estudianteId);
      return {
        id: m.estudiante.id, dni: m.estudiante.dni, codigoEstudiante: m.estudiante.codigoEstudiante,
        nombres: m.estudiante.nombres, apellidos: m.estudiante.apellidos,
        nombreApoderado: m.estudiante.nombreApoderado, telefonoApoderado: m.estudiante.telefonoApoderado,
        estado: r?.estado ?? null, observacion: r?.observacion ?? "",
        faltasInjustificadas: mapaFaltas.get(m.estudiante.id) ?? 0,
      };
    }),
  };
});

/**
 * Guarda la asistencia del día. Regla crítica: si un estudiante acumula ≥ 3 faltas injustificadas
 * en el año, se genera una notificación ALERTA para ADMINISTRATIVO y el apoderado vinculado
 * (sin duplicar alertas idénticas en el mismo día).
 */
export const POST = route(["ADMINISTRADOR", "DOCENTE"], async (req, { user }) => {
  const body = await leerJson(req);
  const seccionId = texto(body.seccionId, "Sección");
  const f = fecha(body.fecha, "Fecha");
  if (f > fechaISO()) throw badRequest("No se puede registrar asistencia en una fecha futura.");
  if (!Array.isArray(body.registros) || body.registros.length === 0) throw badRequest("No hay registros de asistencia para guardar.");
  await validarAccesoSeccion(user.rol, user.id, seccionId);

  const seccion = await prisma.seccion.findUnique({ where: { id: seccionId } });
  if (!seccion) throw notFound("Sección no encontrada.");
  const matriculados = await prisma.matricula.findMany({ where: { seccionId, estado: "ACTIVA" }, select: { estudianteId: true } });
  const permitidos = new Set(matriculados.map((m) => m.estudianteId));

  const registros = (body.registros as unknown[]).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const estudianteId = texto(o.estudianteId, "Estudiante");
    if (!permitidos.has(estudianteId)) throw badRequest("Uno de los estudiantes no está matriculado en la sección seleccionada.");
    return {
      estudianteId,
      estado: enumerado(o.estado, "Estado de asistencia", ESTADOS_ASISTENCIA),
      observacion: textoOpc(o.observacion, "Observación", { max: 200 }),
    };
  });

  await prisma.$transaction(
    registros.map((r) =>
      prisma.asistencia.upsert({
        where: { estudianteId_seccionId_fecha: { estudianteId: r.estudianteId, seccionId, fecha: f } },
        create: { ...r, seccionId, fecha: f, registradoPorId: user.id },
        update: { estado: r.estado, observacion: r.observacion, registradoPorId: user.id },
      })
    )
  );

  // Regla de alerta por inasistencias
  const alertas: { estudianteId: string; nombre: string; faltas: number }[] = [];
  const anio = f.slice(0, 4);
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const administrativos = await idsPorRol(prisma, "ADMINISTRATIVO");

  for (const r of registros.filter((x) => x.estado === "FALTA_INJUSTIFICADA")) {
    const faltas = await prisma.asistencia.count({
      where: { estudianteId: r.estudianteId, estado: "FALTA_INJUSTIFICADA", fecha: { gte: `${anio}-01-01`, lte: `${anio}-12-31` } },
    });
    if (faltas < 3) continue;
    const est = await prisma.estudiante.findUnique({ where: { id: r.estudianteId } });
    if (!est) continue;
    const titulo = `Alerta de inasistencias: ${est.apellidos}, ${est.nombres}`;
    const destinatarios = [...administrativos, ...(est.usuarioApoderadoId ? [est.usuarioApoderadoId] : [])];
    const yaNotificados = await prisma.notificacion.findMany({
      where: { titulo, tipo: "ALERTA", usuarioId: { in: destinatarios }, createdAt: { gte: inicioHoy } },
      select: { usuarioId: true },
    });
    const ya = new Set(yaNotificados.map((n) => n.usuarioId));
    const nuevos = destinatarios.filter((id) => !ya.has(id));
    await notificar(
      prisma,
      nuevos,
      titulo,
      `${est.nombres} ${est.apellidos} (${est.codigoEstudiante}) acumula ${faltas} faltas injustificadas en ${nombreSeccion(seccion)}. Se recomienda contactar al apoderado ${est.nombreApoderado} (${est.telefonoApoderado}).`,
      "ALERTA"
    );
    alertas.push({ estudianteId: est.id, nombre: `${est.nombres} ${est.apellidos}`, faltas });
  }

  return { ok: true, guardados: registros.length, alertas };
});
