// Tipos de las respuestas de la API usados por la interfaz

export interface Seccion {
  id: string; nivel: "PRIMARIA" | "SECUNDARIA"; grado: string; nombre: string; turno: string;
  capacidadMaxima: number; anioAcademico: number; matriculados: number; vacantes: number;
}
export interface Estudiante {
  id: string; dni: string; codigoEstudiante: string; nombres: string; apellidos: string; fechaNacimiento: string;
  nombreApoderado: string; telefonoApoderado: string; estado: "POSTULANTE" | "MATRICULADO" | "RETIRADO";
  usuarioApoderadoId: string | null;
  apoderado?: { id: string; nombre: string; apellidos: string; email: string } | null;
  matriculas?: { id: string; seccion: { id: string; grado: string; nombre: string } }[];
}
export interface Docente {
  id: string; dni: string; nombres: string; apellidos: string; especialidad: string; telefono: string; email: string;
  estado: "ACTIVO" | "INACTIVO"; usuario?: { id: string; email: string } | null; _count?: { horarios: number };
}
export interface Curso { id: string; codigo: string; nombre: string; area: string; horasSemanales: number; _count?: { horarios: number } }
export interface Matricula {
  id: string; codigoMatricula: string; estudianteId: string; seccionId: string; fechaMatricula: string;
  estado: "ACTIVA" | "ANULADA"; observaciones: string | null; estudiante: Estudiante;
  seccion: { id: string; nivel: string; grado: string; nombre: string; turno: string; anioAcademico: number; capacidadMaxima: number };
}
export interface Horario {
  id: string; seccionId: string; cursoId: string; docenteId: string; diaSemana: string; horaInicio: string; horaFin: string; aula: string;
  curso: Curso; docente: Docente; seccion: Seccion;
}
export interface Pago {
  id: string; codigoRecibo: string; codigoOperacion: string | null; estudianteId: string; concepto: string; monto: number;
  fechaVencimiento: string; fechaPago: string | null; metodoPago: string | null; estado: "PENDIENTE" | "PAGADO" | "VENCIDO";
  estudiante: { id: string; nombres: string; apellidos: string; codigoEstudiante: string; dni: string; nombreApoderado: string };
}
export interface Documento {
  id: string; titulo: string; tipo: string; descripcion: string; rutaArchivo: string | null; estudianteId: string | null;
  seccionId: string | null; subidoPorId: string; createdAt: string; subidoPor: string; seccionNombre: string | null;
  estudiante: { nombres: string; apellidos: string; codigoEstudiante: string } | null;
}
export interface Notificacion { id: string; titulo: string; mensaje: string; tipo: "INFO" | "ALERTA" | "EXITO"; leida: boolean; createdAt: string }
export interface UsuarioLista { id: string; nombre: string; apellidos: string; email: string; rol: string; activo: boolean; createdAt: string }
