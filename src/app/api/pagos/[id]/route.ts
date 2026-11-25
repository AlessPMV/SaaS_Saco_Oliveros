import { prisma } from "@/lib/prisma";
import { route, notFound, forbidden } from "@/lib/api";
import { GESTION } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>([...GESTION, "APODERADO_ESTUDIANTE"], async (_req, { params, user }) => {
  const p = await prisma.pago.findUnique({ where: { id: params.id }, include: { estudiante: true } });
  if (!p) throw notFound("Recibo no encontrado.");
  if (user.rol === "APODERADO_ESTUDIANTE" && p.estudiante.usuarioApoderadoId !== user.id) throw forbidden("Este recibo no corresponde a su cuenta.");
  return p;
});
