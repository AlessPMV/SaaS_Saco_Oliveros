// Constantes de roles y rutas. Archivo seguro para Edge (middleware) y cliente: sin dependencias de Node.

export const ROLES = ["ADMINISTRADOR", "ADMINISTRATIVO", "DOCENTE", "APODERADO_ESTUDIANTE"] as const;
export type Rol = (typeof ROLES)[number];

export const ROL_LABEL: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  ADMINISTRATIVO: "Personal Administrativo",
  DOCENTE: "Docente",
  APODERADO_ESTUDIANTE: "Apoderado / Estudiante",
};

export interface NavItem {
  href: string;
  label: string;
  icon: "dashboard" | "academico" | "matriculas" | "horarios" | "asistencia" | "pagos" | "documentos" | "reportes" | "usuarios";
  roles: readonly Rol[];
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ROLES },
  { href: "/academico", label: "Gestión Académica", icon: "academico", roles: ["ADMINISTRADOR", "ADMINISTRATIVO"] },
  { href: "/matriculas", label: "Admisión y Matrículas", icon: "matriculas", roles: ["ADMINISTRADOR", "ADMINISTRATIVO"] },
  { href: "/horarios", label: "Horarios", icon: "horarios", roles: ROLES },
  { href: "/asistencia", label: "Asistencia", icon: "asistencia", roles: ROLES },
  { href: "/pagos", label: "Pagos y Pensiones", icon: "pagos", roles: ["ADMINISTRADOR", "ADMINISTRATIVO", "APODERADO_ESTUDIANTE"] },
  { href: "/documentos", label: "Documentos", icon: "documentos", roles: ROLES },
  { href: "/reportes", label: "Reportes", icon: "reportes", roles: ["ADMINISTRADOR", "ADMINISTRATIVO"] },
  { href: "/usuarios", label: "Usuarios", icon: "usuarios", roles: ["ADMINISTRADOR"] },
];

export function puedeVerRuta(rol: Rol, pathname: string): boolean {
  const item = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
  if (!item) return true;
  return item.roles.includes(rol);
}

export const ADMIN: readonly Rol[] = ["ADMINISTRADOR"];
export const GESTION: readonly Rol[] = ["ADMINISTRADOR", "ADMINISTRATIVO"];
export const TODOS: readonly Rol[] = ROLES;
