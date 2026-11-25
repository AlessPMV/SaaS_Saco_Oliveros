import { prisma } from "@/lib/prisma";
import { route, badRequest } from "@/lib/api";
import { GESTION } from "@/lib/permissions";
import { nombreSeccion } from "@/lib/utils";
import { actualizarVencidos, seccionesConOcupacion } from "@/lib/servicios";

export const dynamic = "force-dynamic";

export const GET = route(GESTION, async (req) => {
  const tipo = req.nextUrl.searchParams.get("tipo");
  await actualizarVencidos();

  if (tipo === "matriculas") {
    const secciones = await seccionesConOcupacion();
    return secciones.map((s) => ({
      seccion: nombreSeccion(s), nivel: s.nivel, capacidad: s.capacidadMaxima, matriculados: s.matriculados, vacantes: s.vacantes,
      ocupacion: Math.round((s.matriculados / s.capacidadMaxima) * 100),
    }));
  }

  if (tipo === "recaudacion") {
    const pagos = await prisma.pago.findMany();
    const agrupar = (clave: (p: (typeof pagos)[number]) => string, filtro: (p: (typeof pagos)[number]) => boolean = () => true) => {
      const m = new Map<string, { cantidad: number; monto: number }>();
      pagos.filter(filtro).forEach((p) => {
        const k = clave(p);
        const a = m.get(k) ?? { cantidad: 0, monto: 0 };
        a.cantidad += 1; a.monto += p.monto;
        m.set(k, a);
      });
      return Array.from(m, ([nombre, v]) => ({ nombre, ...v }));
    };
    return {
      porEstado: agrupar((p) => p.estado),
      porConcepto: agrupar((p) => p.concepto),
      porMetodo: agrupar((p) => p.metodoPago ?? "—", (p) => p.estado === "PAGADO"),
    };
  }

  if (tipo === "inasistencias") {
    const asistencias = await prisma.asistencia.findMany({ include: { estudiante: true, seccion: true } });
    const m = new Map<string, { codigo: string; estudiante: string; seccion: string; tardanzas: number; justificadas: number; injustificadas: number; registros: number }>();
    asistencias.forEach((a) => {
      const x = m.get(a.estudianteId) ?? { codigo: a.estudiante.codigoEstudiante, estudiante: `${a.estudiante.apellidos}, ${a.estudiante.nombres}`, seccion: nombreSeccion(a.seccion), tardanzas: 0, justificadas: 0, injustificadas: 0, registros: 0 };
      x.registros += 1;
      if (a.estado === "TARDANZA") x.tardanzas += 1;
      if (a.estado === "FALTA_JUSTIFICADA") x.justificadas += 1;
      if (a.estado === "FALTA_INJUSTIFICADA") x.injustificadas += 1;
      m.set(a.estudianteId, x);
    });
    return Array.from(m.values()).sort((a, b) => b.injustificadas - a.injustificadas || a.estudiante.localeCompare(b.estudiante));
  }

  if (tipo === "morosidad") {
    const deudas = await prisma.pago.findMany({ where: { estado: { in: ["PENDIENTE", "VENCIDO"] } }, include: { estudiante: true } });
    const m = new Map<string, { codigo: string; estudiante: string; apoderado: string; telefono: string; recibos: number; vencidos: number; monto: number }>();
    deudas.forEach((p) => {
      const x = m.get(p.estudianteId) ?? { codigo: p.estudiante.codigoEstudiante, estudiante: `${p.estudiante.apellidos}, ${p.estudiante.nombres}`, apoderado: p.estudiante.nombreApoderado, telefono: p.estudiante.telefonoApoderado, recibos: 0, vencidos: 0, monto: 0 };
      x.recibos += 1; x.monto += p.monto;
      if (p.estado === "VENCIDO") x.vencidos += 1;
      m.set(p.estudianteId, x);
    });
    return Array.from(m.values()).sort((a, b) => b.vencidos - a.vencidos || b.monto - a.monto);
  }

  throw badRequest("Tipo de reporte no válido. Use: matriculas, recaudacion, inasistencias o morosidad.");
});
