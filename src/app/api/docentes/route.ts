import { prisma } from "@/lib/prisma";
import { route, leerJson, created } from "@/lib/api";
import { ADMIN, ROLES } from "@/lib/permissions";
import { validarDocente } from "@/lib/esquemas";

export const dynamic = "force-dynamic";

export const GET = route(ROLES.filter((r) => r !== "APODERADO_ESTUDIANTE"), async (req) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const estado = req.nextUrl.searchParams.get("estado");
  return prisma.docente.findMany({
    where: {
      ...(estado ? { estado } : {}),
      ...(q ? { OR: [{ nombres: { contains: q } }, { apellidos: { contains: q } }, { dni: { contains: q } }, { especialidad: { contains: q } }] } : {}),
    },
    include: { usuario: { select: { id: true, email: true } }, _count: { select: { horarios: true } } },
    orderBy: { apellidos: "asc" },
  });
});

export const POST = route(ADMIN, async (req) => {
  const body = await leerJson(req);
  return created(await prisma.docente.create({ data: validarDocente(body) }));
});
