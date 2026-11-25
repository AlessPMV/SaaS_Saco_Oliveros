import { prisma } from "@/lib/prisma";
import { route, leerJson, notFound, conflict } from "@/lib/api";
import { ADMIN } from "@/lib/permissions";
import { validarUsuario } from "@/lib/esquemas-usuario";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const PUT = route<{ id: string }>(ADMIN, async (req, { params, user }) => {
  const datos = validarUsuario(await leerJson(req), false);
  if (!(await prisma.usuario.findUnique({ where: { id: params.id } }))) throw notFound("Usuario no encontrado.");
  if (params.id === user.id && (!datos.activo || datos.rol !== "ADMINISTRADOR")) {
    throw conflict("No puede desactivar su propia cuenta ni quitarse el rol de Administrador.");
  }
  const { password, ...resto } = datos;
  return prisma.usuario.update({
    where: { id: params.id },
    data: { ...resto, ...(password ? { password: await hashPassword(password) } : {}) },
    select: { id: true, nombre: true, apellidos: true, email: true, rol: true, activo: true, createdAt: true },
  });
});
