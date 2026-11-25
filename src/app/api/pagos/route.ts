import { prisma } from "@/lib/prisma";
import { route, leerJson, created, notFound } from "@/lib/api";
import { GESTION } from "@/lib/permissions";
import { fecha, numero, texto } from "@/lib/validators";
import { actualizarVencidos, siguienteCodigoRecibo } from "@/lib/servicios";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = route([...GESTION, "APODERADO_ESTUDIANTE"], async (req, { user }) => {
  await actualizarVencidos();
  const sp = req.nextUrl.searchParams;
  const where: Prisma.PagoWhereInput = {};
  if (sp.get("estudianteId")) where.estudianteId = sp.get("estudianteId")!;
  if (sp.get("estado")) where.estado = sp.get("estado")!;
  const q = sp.get("concepto")?.trim();
  if (q) where.OR = [{ concepto: { contains: q } }, { codigoRecibo: { contains: q } }];
  if (user.rol === "APODERADO_ESTUDIANTE") where.estudiante = { usuarioApoderadoId: user.id };
  return prisma.pago.findMany({
    where,
    include: { estudiante: { select: { id: true, nombres: true, apellidos: true, codigoEstudiante: true, dni: true, nombreApoderado: true } } },
    orderBy: [{ fechaVencimiento: "desc" }, { codigoRecibo: "desc" }],
  });
});

/** Genera un cargo manual (otros conceptos) para un estudiante. */
export const POST = route(GESTION, async (req) => {
  const body = await leerJson(req);
  const estudianteId = texto(body.estudianteId, "Estudiante");
  const datos = {
    concepto: texto(body.concepto, "Concepto", { max: 120 }),
    monto: numero(body.monto, "Monto", { min: 1, max: 20000 }),
    fechaVencimiento: fecha(body.fechaVencimiento, "Fecha de vencimiento"),
  };
  if (!(await prisma.estudiante.findUnique({ where: { id: estudianteId } }))) throw notFound("Estudiante no encontrado.");
  const pago = await prisma.$transaction(async (tx) => {
    const codigoRecibo = await siguienteCodigoRecibo(tx);
    return tx.pago.create({ data: { ...datos, codigoRecibo, estudianteId, estado: "PENDIENTE" } });
  });
  return created(pago);
});
