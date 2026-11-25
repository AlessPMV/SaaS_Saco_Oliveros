import { prisma } from "@/lib/prisma";
import { route, leerJson, created } from "@/lib/api";
import { ADMIN, TODOS } from "@/lib/permissions";
import { validarSeccion } from "@/lib/esquemas";
import { seccionesConOcupacion } from "@/lib/servicios";
import { seccionesDelApoderado, seccionesDelDocente } from "@/lib/servicios";

export const dynamic = "force-dynamic";

export const GET = route(TODOS, async (_req, { user }) => {
  let secciones = await seccionesConOcupacion();
  if (user.rol === "DOCENTE") {
    const ids = await seccionesDelDocente(user.id);
    secciones = secciones.filter((s) => ids.includes(s.id));
  } else if (user.rol === "APODERADO_ESTUDIANTE") {
    const ids = await seccionesDelApoderado(user.id);
    secciones = secciones.filter((s) => ids.includes(s.id));
  }
  return secciones;
});

export const POST = route(ADMIN, async (req) => created(await prisma.seccion.create({ data: validarSeccion(await leerJson(req)) })));
