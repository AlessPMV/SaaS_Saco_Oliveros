import { prisma } from "@/lib/prisma";
import { route, leerJson, created } from "@/lib/api";
import { ADMIN, GESTION } from "@/lib/permissions";
import { validarUsuario } from "@/lib/esquemas-usuario";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const select = { id: true, nombre: true, apellidos: true, email: true, rol: true, activo: true, createdAt: true } as const;

export const GET = route(GESTION, async (req, { user }) => {
  const rol = req.nextUrl.searchParams.get("rol");
  // El personal administrativo solo puede consultar apoderados (para vincularlos a estudiantes)
  const filtroRol = user.rol === "ADMINISTRADOR" ? rol : "APODERADO_ESTUDIANTE";
  return prisma.usuario.findMany({ where: filtroRol ? { rol: filtroRol, activo: true } : {}, select, orderBy: [{ rol: "asc" }, { apellidos: "asc" }] });
});

export const POST = route(ADMIN, async (req) => {
  const datos = validarUsuario(await leerJson(req), true);
  const usuario = await prisma.usuario.create({
    data: { nombre: datos.nombre, apellidos: datos.apellidos, email: datos.email, rol: datos.rol, activo: datos.activo, password: await hashPassword(datos.password!) },
    select,
  });
  return created(usuario);
});
