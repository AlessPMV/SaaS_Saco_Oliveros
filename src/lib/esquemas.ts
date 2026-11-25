import { dni, texto, fecha, telefono, email, entero, enumerado } from "@/lib/validators";

export function validarEstudiante(body: Record<string, unknown>) {
  return {
    dni: dni(body.dni),
    nombres: texto(body.nombres, "Nombres", { max: 80 }),
    apellidos: texto(body.apellidos, "Apellidos", { max: 80 }),
    fechaNacimiento: fecha(body.fechaNacimiento, "Fecha de nacimiento"),
    nombreApoderado: texto(body.nombreApoderado, "Nombre del apoderado", { max: 120 }),
    telefonoApoderado: telefono(body.telefonoApoderado, "Teléfono del apoderado"),
    usuarioApoderadoId: typeof body.usuarioApoderadoId === "string" && body.usuarioApoderadoId ? body.usuarioApoderadoId : null,
  };
}

export function validarDocente(body: Record<string, unknown>) {
  return {
    dni: dni(body.dni),
    nombres: texto(body.nombres, "Nombres", { max: 80 }),
    apellidos: texto(body.apellidos, "Apellidos", { max: 80 }),
    especialidad: texto(body.especialidad, "Especialidad", { max: 80 }),
    telefono: telefono(body.telefono),
    email: email(body.email),
    estado: body.estado ? enumerado(body.estado, "Estado", ["ACTIVO", "INACTIVO"] as const) : ("ACTIVO" as const),
  };
}

export function validarCurso(body: Record<string, unknown>) {
  return {
    codigo: texto(body.codigo, "Código", { max: 20 }).toUpperCase(),
    nombre: texto(body.nombre, "Nombre", { max: 80 }),
    area: texto(body.area, "Área", { max: 60 }),
    horasSemanales: entero(body.horasSemanales, "Horas semanales", { min: 1, max: 40 }),
  };
}

export function validarSeccion(body: Record<string, unknown>) {
  return {
    nivel: enumerado(body.nivel, "Nivel", ["PRIMARIA", "SECUNDARIA"] as const),
    grado: texto(body.grado, "Grado", { max: 40 }),
    nombre: texto(body.nombre, "Nombre de la sección", { max: 40 }),
    turno: "MAÑANA",
    capacidadMaxima: entero(body.capacidadMaxima, "Capacidad máxima", { min: 1, max: 60 }),
    anioAcademico: body.anioAcademico ? entero(body.anioAcademico, "Año académico", { min: 2020, max: 2100 }) : 2026,
  };
}

