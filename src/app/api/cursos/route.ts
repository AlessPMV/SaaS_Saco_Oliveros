import { prisma } from "@/lib/prisma";
import { route, leerJson, created } from "@/lib/api";
import { ADMIN, ROLES } from "@/lib/permissions";
import { validarCurso } from "@/lib/esquemas";

export const dynamic = "force-dynamic";

export const GET = route(ROLES.filter((r) => r !== "APODERADO_ESTUDIANTE"), async (req) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const area = req.nextUrl.searchParams.get("area");
  return prisma.curso.findMany({
    where: {
      ...(area ? { area } : {}),
      ...(q ? { OR: [{ nombre: { contains: q } }, { codigo: { contains: q } }] } : {}),
    },
    include: { _count: { select: { horarios: true } } },
    orderBy: { nombre: "asc" },
  });
});

export const POST = route(ADMIN, async (req) => created(await prisma.curso.create({ data: validarCurso(await leerJson(req)) })));
