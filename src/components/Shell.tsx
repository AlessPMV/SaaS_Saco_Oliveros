"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, BookOpen, CalendarClock, ClipboardCheck, FileText, GraduationCap, LayoutDashboard,
  LogOut, Menu, UserCog, Wallet, X, UserPlus, type LucideIcon,
} from "lucide-react";
import { NAV, ROL_LABEL, type NavItem, type Rol } from "@/lib/permissions";
import { api } from "@/lib/client";
import { NotificationBell } from "@/components/NotificationBell";
import { ToastProvider } from "@/components/ui";

const ICONOS: Record<NavItem["icon"], LucideIcon> = {
  dashboard: LayoutDashboard, academico: BookOpen, matriculas: UserPlus, horarios: CalendarClock,
  asistencia: ClipboardCheck, pagos: Wallet, documentos: FileText, reportes: BarChart3, usuarios: UserCog,
};

interface Props { user: { nombre: string; apellidos: string; email: string; rol: Rol }; children: React.ReactNode }

export function Shell({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const items = NAV.filter((n) => n.roles.includes(user.rol));

  async function salir() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <nav className="flex h-full flex-col bg-blue-950 text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-950"><GraduationCap size={26} /></div>
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-wide">SACO OLIVEROS</p>
          <p className="text-[11px] font-medium text-amber-400">Sede Huancayo · 2026</p>
        </div>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((n) => {
          const Icono = ICONOS[n.icon];
          const activo = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <li key={n.href}>
              <Link href={n.href} onClick={() => setMenu(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${activo ? "bg-white/15 text-white shadow-inner ring-1 ring-white/10" : "text-blue-100 hover:bg-white/10"}`}>
                <Icono size={18} />
                <span>{n.label}</span>
                {activo && <span className="ml-auto h-2 w-2 rounded-full bg-red-600" />}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-blue-200">
        <p className="font-semibold text-white">Plataforma SaaS académica</p>
        <p>Huancayo, Junín — Perú</p>
      </div>
    </nav>
  );

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
        {menu && (
          <div className="no-print fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenu(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">
              <button onClick={() => setMenu(false)} className="absolute right-2 top-3 z-10 rounded-md p-1 text-white/80 hover:bg-white/10" aria-label="Cerrar menú"><X size={20} /></button>
              {sidebar}
            </aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMenu(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú"><Menu size={22} /></button>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-blue-950">Colegio Saco Oliveros — Sede Huancayo</p>
                <p className="text-xs text-slate-500">Año académico 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationBell />
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-semibold text-slate-800">{user.nombre} {user.apellidos}</p>
                <p className="text-xs font-medium text-red-700">{ROL_LABEL[user.rol]}</p>
              </div>
              <button onClick={salir} className="btn btn-outline btn-sm" title="Cerrar sesión"><LogOut size={15} /><span className="hidden sm:inline">Salir</span></button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
