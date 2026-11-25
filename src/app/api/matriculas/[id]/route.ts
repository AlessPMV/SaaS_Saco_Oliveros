import { prisma } from "@/lib/prisma";
import { route, leerJson, notFound, forbidden, conflict } from "@/lib/api";
import { GESTION } from "@/lib/permissions";
import { enumerado } from "@/lib/validators";
import { notificar } from "@/lib/servicios";

export const dynamic = "force-dynamic";

type P = { id: string };

export const GET = route<P>([...GESTION, "APODERADO_ESTUDIANTE"], async (_req, { params, user }) => {
  const m = await prisma.matricula.findUnique({ where: { id: params.id }, include: { estudiante: true, seccion: true } });
  if (!m) throw notFound("Matrícula no encontrada.");
  if (user.rol === "APODERADO_ESTUDIANTE" && m.estudiante.usuarioApoderadoId !== user.id) throw forbidden("Esta matrícula no corresponde a su cuenta.");
  return m;
});

/** Anula una matrícula (libera la vacante) y marca al estudiante como RETIRADO. */
export const PATCH = route<P>(GESTION, async (req, { params, user }) => {
  const body = await leerJson(req);
  const estado = enumerado(body.estado, "Estado", ["ANULADA"] as const);
  const m = await prisma.matricula.findUnique({ where: { id: params.id }, include: { estudiante: true } });
  if (!m) throw notFound("Matrícula no encontrada.");
  if (m.estado === "ANULADA") throw conflict("La matrícula ya se encuentra anulada.");
  await prisma.$transaction(async (tx) => {
    await tx.matricula.update({ where: { id: m.id }, data: { estado } });
    await tx.estudiante.update({ where: { id: m.estudianteId }, data: { estado: "RETIRADO" } });
    await notificar(tx, [user.id], "Matrícula anulada", `Se anuló la matrícula ${m.codigoMatricula} de ${m.estudiante.nombres} ${m.estudiante.apellidos}. La vacante fue liberada.`, "INFO");
  });
  return { ok: true };
});
