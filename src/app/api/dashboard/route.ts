import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { ROLES } from "@/lib/permissions";
import { DIAS, fechaISO, nombreSeccion } from "@/lib/utils";
import { actualizarVencidos, seccionesConOcupacion, seccionesDelDocente } from "@/lib/servicios";

export const dynamic = "force-dynamic";

export const GET = route(ROLES, async (_req, { user }) => {
  await actualizarVencidos();
  const hoy = new Date();
  const diaHoy = DIAS[hoy.getDay() - 1] ?? null; // null en fin de semana

  // ───── Docente: su semana y secciones a cargo
  if (user.rol === "DOCENTE") {
    const docente = await prisma.docente.findUnique({ where: { usuarioId: user.id } });
    const horarios = docente ? await prisma.horario.findMany({ where: { docenteId: docente.id }, include: { curso: true, seccion: true }, orderBy: [{ horaInicio: "asc" }] }) : [];
    const ids = await seccionesDelDocente(user.id);
    const secciones = (await seccionesConOcupacion()).filter((s) => ids.includes(s.id));
    return {
      rol: user.rol,
      docente: docente ? { nombre: `${docente.nombres} ${docente.apellidos}`, especialidad: docente.especialidad } : null,
      diaHoy,
      clasesHoy: horarios.filter((h) => h.diaSemana === diaHoy).map((h) => ({ id: h.id, curso: h.curso.nombre, seccion: nombreSeccion(h.seccion), seccionId: h.seccionId, horaInicio: h.horaInicio, horaFin: h.horaFin, aula: h.aula })),
      totalBloques: horarios.length,
      secciones: secciones.map((s) => ({ id: s.id, nombre: nombreSeccion(s), matriculados: s.matriculados, capacidadMaxima: s.capacidadMaxima })),
    };
  }

  // ───── Apoderado: resumen por estudiante
  if (user.rol === "APODERADO_ESTUDIANTE") {
    const estudiantes = await prisma.estudiante.findMany({
      where: { usuarioApoderadoId: user.id },
      include: { matriculas: { where: { estado: "ACTIVA" }, include: { seccion: true } }, asistencias: true, pagos: true },
      orderBy: { apellidos: "asc" },
    });
    return {
      rol: user.rol,
      estudiantes: estudiantes.map((e) => {
        const total = e.asistencias.length;
        const asistio = e.asistencias.filter((a) => a.estado === "PRESENTE" || a.estado === "TARDANZA").length;
        const deuda = e.pagos.filter((p) => p.estado !== "PAGADO");
        return {
          id: e.id,
          nombre: `${e.nombres} ${e.apellidos}`,
          codigo: e.codigoEstudiante,
          estado: e.estado,
          seccion: e.matriculas[0] ? nombreSeccion(e.matriculas[0].seccion) : "Sin matrícula activa",
          asistenciaPorcentaje: total ? Math.round((asistio / total) * 1000) / 10 : null,
          faltasInjustificadas: e.asistencias.filter((a) => a.estado === "FALTA_INJUSTIFICADA").length,
          pagosPendientes: deuda.length,
          montoPendiente: deuda.reduce((s, p) => s + p.monto, 0),
          pagosVencidos: deuda.filter((p) => p.estado === "VENCIDO").length,
        };
      }),
    };
  }

  // ───── Administrador / Administrativo: Dashboard ejecutivo
  const [secciones, asistencias, pagos, ultimosPagos, faltas] = await Promise.all([
    seccionesConOcupacion(),
    prisma.asistencia.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.pago.groupBy({ by: ["estado"], _sum: { monto: true }, _count: { _all: true } }),
    prisma.pago.findMany({ where: { estado: "PAGADO" }, orderBy: { fechaPago: "desc" }, take: 5, include: { estudiante: { select: { nombres: true, apellidos: true } } } }),
    prisma.asistencia.groupBy({ by: ["estudianteId"], where: { estado: "FALTA_INJUSTIFICADA" }, _count: { _all: true } }),
  ]);
  const matriculados = secciones.reduce((s, x) => s + x.matriculados, 0);
  const capacidadTotal = secciones.reduce((s, x) => s + x.capacidadMaxima, 0);
  const totalAsist = asistencias.reduce((s, a) => s + a._count._all, 0);
  const asistio = asistencias.filter((a) => a.estado === "PRESENTE" || a.estado === "TARDANZA").reduce((s, a) => s + a._count._all, 0);
  const suma = (estados: string[]) => pagos.filter((p) => estados.includes(p.estado)).reduce((s, p) => s + (p._sum.monto ?? 0), 0);

  const enRiesgo = faltas.filter((f) => f._count._all >= 2).sort((a, b) => b._count._all - a._count._all).slice(0, 6);
  const estRiesgo = await prisma.estudiante.findMany({
    where: { id: { in: enRiesgo.map((f) => f.estudianteId) } },
    include: { matriculas: { where: { estado: "ACTIVA" }, include: { seccion: true } } },
  });
  const alertas = enRiesgo.map((f) => {
    const e = estRiesgo.find((x) => x.id === f.estudianteId)!;
    return {
      estudianteId: e.id,
      nombre: `${e.nombres} ${e.apellidos}`,
      codigo: e.codigoEstudiante,
      seccion: e.matriculas[0] ? nombreSeccion(e.matriculas[0].seccion) : "—",
      faltas: f._count._all,
      nivel: f._count._all >= 3 ? "ALERTA" : "EN_RIESGO",
    };
  });

  return {
    rol: user.rol,
    hoy: fechaISO(hoy),
    kpis: {
      matriculados,
      vacantes: Math.max(capacidadTotal - matriculados, 0),
      capacidadTotal,
      asistenciaPorcentaje: totalAsist ? Math.round((asistio / totalAsist) * 1000) / 10 : null,
      recaudado: suma(["PAGADO"]),
      pendiente: suma(["PENDIENTE", "VENCIDO"]),
      vencido: suma(["VENCIDO"]),
    },
    ocupacion: secciones.map((s) => ({ id: s.id, nombre: nombreSeccion(s), matriculados: s.matriculados, capacidadMaxima: s.capacidadMaxima, vacantes: s.vacantes })),
    pagosPorEstado: pagos.map((p) => ({ estado: p.estado, cantidad: p._count._all, monto: p._sum.monto ?? 0 })),
    ultimosPagos: ultimosPagos.map((p) => ({ id: p.id, codigoRecibo: p.codigoRecibo, codigoOperacion: p.codigoOperacion, concepto: p.concepto, monto: p.monto, fechaPago: p.fechaPago, metodoPago: p.metodoPago, estudiante: `${p.estudiante.nombres} ${p.estudiante.apellidos}` })),
    alertas,
  };
});
