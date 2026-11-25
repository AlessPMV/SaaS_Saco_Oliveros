import path from "path";
import { unlink } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { route, notFound, forbidden } from "@/lib/api";
import { ROLES } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const DELETE = route<{ id: string }>(ROLES, async (_req, { params, user }) => {
  const d = await prisma.documento.findUnique({ where: { id: params.id } });
  if (!d) throw notFound("Documento no encontrado.");
  const puede = user.rol === "ADMINISTRADOR" || user.rol === "ADMINISTRATIVO" || (user.rol === "DOCENTE" && d.subidoPorId === user.id);
  if (!puede) throw forbidden("No tiene permisos para eliminar este documento.");
  await prisma.documento.delete({ where: { id: params.id } });
  if (d.rutaArchivo?.startsWith("/api/archivos/")) {
    await unlink(path.join(process.cwd(), "public", "uploads", path.basename(d.rutaArchivo))).catch(() => undefined);
  }
  return { ok: true };
});
