// Utilidades compartidas (cliente y servidor)

export const ANIO_ACTIVO = 2026;
export const COLEGIO = "Colegio Saco Oliveros";
export const SEDE = "Sede Huancayo";

export const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"] as const;
export type Dia = (typeof DIAS)[number];
export const DIA_LABEL: Record<Dia, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
};

export const ESTADOS_ASISTENCIA = ["PRESENTE", "TARDANZA", "FALTA_INJUSTIFICADA", "FALTA_JUSTIFICADA"] as const;
export type EstadoAsistencia = (typeof ESTADOS_ASISTENCIA)[number];
export const ASISTENCIA_LABEL: Record<EstadoAsistencia, string> = {
  PRESENTE: "Presente",
  TARDANZA: "Tardanza",
  FALTA_INJUSTIFICADA: "Falta Injustificada",
  FALTA_JUSTIFICADA: "Falta Justificada",
};

export const TIPOS_DOCUMENTO = ["CONSTANCIA_MATRICULA", "BOLETA_PAGO", "SILABO", "CERTIFICADO", "COMUNICADO"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];
export const TIPO_DOC_LABEL: Record<TipoDocumento, string> = {
  CONSTANCIA_MATRICULA: "Constancia de matrícula",
  BOLETA_PAGO: "Boleta / Estado de cuenta",
  SILABO: "Sílabo",
  CERTIFICADO: "Certificado / Constancia de estudios",
  COMUNICADO: "Comunicado",
};

export const METODOS_PAGO = ["YAPE_PLIN", "TARJETA", "TRANSFERENCIA"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];
export const METODO_LABEL: Record<string, string> = {
  YAPE_PLIN: "Yape / Plin",
  TARJETA: "Tarjeta de crédito / débito",
  TRANSFERENCIA: "Transferencia bancaria",
};

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

export function formatSoles(monto: number): string {
  return `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Fecha local en formato YYYY-MM-DD (evita desfases de zona horaria de toISOString). */
export function fechaISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function formatFecha(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatFechaHora(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatFechaLarga(d: Date = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}

export function nombreSeccion(s: { grado: string; nombre: string }): string {
  return `${s.grado} - Sección ${s.nombre}`;
}

export function nombreCompleto(p: { nombres?: string; apellidos: string; nombre?: string }): string {
  return `${p.nombres ?? p.nombre ?? ""} ${p.apellidos}`.trim();
}
