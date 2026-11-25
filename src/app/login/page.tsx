"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, KeyRound, Loader2, Mail, ShieldCheck, UserCog, Users, BookUser, Zap } from "lucide-react";
import { api } from "@/lib/client";

const DEMOS = [
  { rol: "Administrador", detalle: "Dirección de sede", email: "admin@sacooliveros.edu.pe", icon: ShieldCheck },
  { rol: "Personal Administrativo", detalle: "Secretaría académica", email: "secretaria@sacooliveros.edu.pe", icon: UserCog },
  { rol: "Docente", detalle: "Prof. de Matemática", email: "docente@sacooliveros.edu.pe", icon: BookUser },
  { rol: "Apoderado / Estudiante", detalle: "Portal familiar", email: "apoderado@sacooliveros.edu.pe", icon: Users },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);

  async function ingresar(correo: string, clave: string, etiqueta: string) {
    setError(null);
    setCargando(etiqueta);
    try {
      await api("/api/auth/login", { method: "POST", json: { email: correo, password: clave } });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setCargando(null);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-blue-950 p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-red-700/30" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-amber-600/20" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-950"><GraduationCap size={32} /></div>
          <div>
            <p className="text-xl font-extrabold tracking-wide">COLEGIO SACO OLIVEROS</p>
            <p className="text-sm font-medium text-amber-400">Sede Huancayo</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">Gestión académica y administrativa en un solo lugar</h1>
          <p className="mt-4 text-blue-100">Matrícula con control de vacantes, horarios sin cruces, asistencia con alertas automáticas, pensiones y pagos en línea, y reportes para la dirección.</p>
        </div>
        <p className="relative text-xs text-blue-200">Huancayo, Junín — Perú · Año académico 2026</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950 text-white"><GraduationCap size={26} /></div>
            <div><p className="font-extrabold text-blue-950">COLEGIO SACO OLIVEROS</p><p className="text-xs font-medium text-red-700">Sede Huancayo</p></div>
          </div>
          <h2 className="text-2xl font-bold text-blue-950">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">Ingrese con su cuenta institucional.</p>

          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); ingresar(email, password, "form"); }}>
            <div>
              <label className="label" htmlFor="email">Correo electrónico</label>
              <div className="relative"><Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input id="email" type="email" required className="input pl-9" placeholder="usuario@sacooliveros.edu.pe" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></div>
            </div>
            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <div className="relative"><KeyRound size={16} className="absolute left-3 top-3 text-slate-400" />
                <input id="password" type="password" required className="input pl-9" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            <button type="submit" disabled={!!cargando} className="btn btn-primary w-full py-2.5">
              {cargando === "form" && <Loader2 size={16} className="animate-spin" />} Ingresar
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800"><Zap size={16} /> Acceso Rápido de Demostración (1 Clic)</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEMOS.map((d) => (
                <button key={d.email} disabled={!!cargando} onClick={() => ingresar(d.email, "123456", d.email)}
                  className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-950 hover:shadow disabled:opacity-60">
                  {cargando === d.email ? <Loader2 size={20} className="animate-spin text-blue-950" /> : <d.icon size={20} className="shrink-0 text-blue-950" />}
                  <span className="leading-tight"><span className="block text-sm font-semibold text-slate-800">{d.rol}</span><span className="text-[11px] text-slate-500">{d.detalle}</span></span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-amber-800">Contraseña de las cuentas demo: <b>123456</b></p>
          </div>
        </div>
      </section>
    </div>
  );
}
