import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MESES, fechaISO, ANIO_ACTIVO, nombreSeccion } from "@/lib/utils";

type Tx = Prisma.TransactionClient | typeof prisma;

// ───────────── Generación de códigos correlativos ─────────────

async function siguiente(ultimo: string | null | undefined, prefijo: string, digitos: number): Promise<string> {
  const n = ultimo ? parseInt(ultimo.slice(prefijo.length), 10) || 0 : 0;
  return `${prefijo}${String(n + 1).padStart(digitos, "0")}`;
}

export async function siguienteCodigoEstudiante(tx: Tx, anio = ANIO_ACTIVO): Promise<string> {
  const prefijo = `SO-HYO-${anio}-`;
  const u = await tx.estudiante.findFirst({ where: { codigoEstudiante: { startsWith: prefijo } }, orderBy: { codigoEstudiante: "desc" }, select: { codigoEstudiante: true } });
  return siguiente(u?.codigoEstudiante, prefijo, 3);
}

export async function siguienteCodigoMatricula(tx: Tx, anio = ANIO_ACTIVO): Promise<string> {
  const prefijo = `MAT-${anio}-`;
  const u = await tx.matricula.findFirst({ where: { codigoMatricula: { startsWith: prefijo } }, orderBy: { codigoMatricula: "desc" }, select: { codigoMatricula: true } });
  return siguiente(u?.codigoMatricula, prefijo, 4);
}

export async function siguienteCodigoRecibo(tx: Tx, anio = ANIO_ACTIVO): Promise<string> {
  const prefijo = `REC-${anio}-`;
  const u = await tx.pago.findFirst({ where: { codigoRecibo: { startsWith: prefijo } }, orderBy: { codigoRecibo: "desc" }, select: { codigoRecibo: true } });
  return siguiente(u?.codigoRecibo, prefijo, 5);
}

export async function siguienteCodigoOperacion(tx: Tx, anio = ANIO_ACTIVO): Promise<string> {
  const prefijo = `OP-${anio}-`;
  const u = await tx.pago.findFirst({ where: { codigoOperacion: { startsWith: prefijo } }, orderBy: { codigoOperacion: "desc" }, select: { codigoOperacion: true } });
  return siguiente(u?.codigoOperacion, prefijo, 5);
}

// ───────────── Vacantes ─────────────

export async function matriculadosActivos(tx: Tx, seccionId: string): Promise<number> {
  return tx.matricula.count({ where: { seccionId, estado: "ACTIVA" } });
}

export async function seccionesConOcupacion() {
  const [secciones, conteos] = await Promise.all([
    prisma.seccion.findMany({ orderBy: [{ nivel: "asc" }, { grado: "asc" }, { nombre: "asc" }] }),
    prisma.matricula.groupBy({ by: ["seccionId"], where: { estado: "ACTIVA" }, _count: { _all: true } }),
  ]);
  const mapa = new Map(conteos.map((c) => [c.seccionId, c._count._all]));
  return secciones.map((s) => {
    const matriculados = mapa.get(s.id) ?? 0;
    return { ...s, matriculados, vacantes: Math.max(s.capacidadMaxima - matriculados, 0) };
  });
}

// ───────────── Notificaciones ─────────────

export async function notificar(
  tx: Tx,
  usuarioIds: string[],
  titulo: string,
  mensaje: string,
  tipo: "INFO" | "ALERTA" | "EXITO" = "INFO"
) {
  const unicos = Array.from(new Set(usuarioIds));
  if (unicos.length === 0) return;
  await tx.notificacion.createMany({ data: unicos.map((usuarioId) => ({ usuarioId, titulo, mensaje, tipo })) });
}

export async function idsPorRol(tx: Tx, rol: string): Promise<string[]> {
  const us = await tx.usuario.findMany({ where: { rol, activo: true }, select: { id: true } });
  return us.map((u) => u.id);
}

// ───────────── Cruces de horario ─────────────

export interface BloqueHorario {
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  docenteId: string;
  seccionId: string;
}

/**
 * Regla de negocio: dos bloques del mismo día se cruzan si
 *   horaInicio_A < horaFin_B  Y  horaFin_A > horaInicio_B
 * Se verifica tanto el cruce del docente como el de la sección.
 * Devuelve el mensaje descriptivo del primer conflicto o null si no hay cruce.
 */
export async function detectarCruceHorario(b: BloqueHorario, excluirId?: string): Promise<string | null> {
  const choques = await prisma.horario.findMany({
    where: {
      diaSemana: b.diaSemana,
      horaInicio: { lt: b.horaFin },
      horaFin: { gt: b.horaInicio },
      ...(excluirId ? { id: { not: excluirId } } : {}),
      OR: [{ docenteId: b.docenteId }, { seccionId: b.seccionId }],
    },
    include: { curso: true, seccion: true, docente: true },
  });
  const delDocente = choques.find((c) => c.docenteId === b.docenteId);
  if (delDocente) {
    return `Cruce de horario del docente: ${delDocente.docente.nombres} ${delDocente.docente.apellidos} ya dicta «${delDocente.curso.nombre}» en ${nombreSeccion(delDocente.seccion)} el mismo día de ${delDocente.horaInicio} a ${delDocente.horaFin}.`;
  }
  const delaSeccion = choques.find((c) => c.seccionId === b.seccionId);
  if (delaSeccion) {
    return `Cruce de horario de la sección: ${nombreSeccion(delaSeccion.seccion)} ya tiene «${delaSeccion.curso.nombre}» (${delaSeccion.docente.nombres} ${delaSeccion.docente.apellidos}) de ${delaSeccion.horaInicio} a ${delaSeccion.horaFin}.`;
  }
  return null;
}

// ───────────── Cargos de pago ─────────────

export function montoPension(nivel: string, grado: string, nombreSec: string): number {
  if (nivel === "PRIMARIA") return 350;
  if (/pre-?u/i.test(nombreSec)) return 500;
  if (/c[ií]rculo/i.test(nombreSec)) return 450;
  return /1ro|2do/i.test(grado) ? 400 : 420;
}

export const MONTO_MATRICULA = 250;

export function sumarDias(base: Date, dias: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return fechaISO(d);
}

/** Genera los cargos iniciales de una matrícula: «Matrícula 2026» y «Pensión Marzo 2026». */
export async function generarCargosMatricula(
  tx: Tx,
  estudianteId: string,
  seccion: { nivel: string; grado: string; nombre: string; anioAcademico: number }
) {
  const hoy = new Date();
  const anio = seccion.anioAcademico;
  const cargos = [
    { concepto: `Matrícula ${anio}`, monto: MONTO_MATRICULA, venc: sumarDias(hoy, 7) },
    { concepto: `Pensión ${MESES[2]} ${anio}`, monto: montoPension(seccion.nivel, seccion.grado, seccion.nombre), venc: sumarDias(hoy, 15) },
  ];
  const creados = [];
  for (const c of cargos) {
    const codigoRecibo = await siguienteCodigoRecibo(tx);
    creados.push(
      await tx.pago.create({
        data: { codigoRecibo, estudianteId, concepto: c.concepto, monto: c.monto, fechaVencimiento: c.venc, estado: "PENDIENTE" },
      })
    );
  }
  return creados;
}

/** Marca como VENCIDO los recibos PENDIENTES cuya fecha de vencimiento ya pasó. */
export async function actualizarVencidos() {
  await prisma.pago.updateMany({
    where: { estado: "PENDIENTE", fechaVencimiento: { lt: fechaISO() } },
    data: { estado: "VENCIDO" },
  });
}

// ───────────── Alcance por rol (apoderado / docente) ─────────────

export async function estudiantesDelApoderado(usuarioId: string): Promise<string[]> {
  const es = await prisma.estudiante.findMany({ where: { usuarioApoderadoId: usuarioId }, select: { id: true } });
  return es.map((e) => e.id);
}

export async function seccionesDelDocente(usuarioId: string): Promise<string[]> {
  const docente = await prisma.docente.findUnique({ where: { usuarioId }, select: { id: true } });
  if (!docente) return [];
  const hs = await prisma.horario.findMany({ where: { docenteId: docente.id }, select: { seccionId: true }, distinct: ["seccionId"] });
  return hs.map((h) => h.seccionId);
}

export async function seccionesDelApoderado(usuarioId: string): Promise<string[]> {
  const ms = await prisma.matricula.findMany({
    where: { estado: "ACTIVA", estudiante: { usuarioApoderadoId: usuarioId } },
    select: { seccionId: true },
  });
  return Array.from(new Set(ms.map((m) => m.seccionId)));
}
