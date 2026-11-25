import { badRequest } from "@/lib/api";
import { ROLES } from "@/lib/permissions";
import { email, enumerado, texto } from "@/lib/validators";

export function validarUsuario(body: Record<string, unknown>, passwordObligatorio: boolean) {
  let password: string | undefined;
  if (passwordObligatorio || (typeof body.password === "string" && body.password !== "")) {
    password = texto(body.password, "Contraseña");
    if (password.length < 6) throw badRequest("La contraseña debe tener al menos 6 caracteres.");
  }
  return {
    nombre: texto(body.nombre, "Nombre", { max: 80 }),
    apellidos: texto(body.apellidos, "Apellidos", { max: 80 }),
    email: email(body.email),
    rol: enumerado(body.rol, "Rol", ROLES),
    activo: body.activo === undefined ? true : body.activo === true,
    password,
  };
}
