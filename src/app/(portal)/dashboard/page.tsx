"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, GraduationCap, Percent, Users, Wallet } from "lucide-react";
import { useApi } from "@/lib/client";
import { Badge, Barra, Empty, ErrorBox, PageHeader, Spinner, StatCard } from "@/components/ui";
import { DIA_LABEL, formatFechaHora, formatSoles, type Dia } from "@/lib/utils";

interface Ejecutivo {
  rol: "ADMINISTRADOR" | "ADMINISTRATIVO";
  kpis: { matriculados: number; vacantes: number; capacidadTotal: number; asistenciaPorcentaje: number | null; recaudado: number; pendiente: number; vencido: number };
  ocupacion: { id: string; nombre: string; matriculados: number; capacidadMaxima: number; vacantes: number }[];
  ultimosPagos: { id: string; codigoRecibo: string; codigoOperacion: string | null; concepto: string; monto: number; fechaPago: string; metodoPago: string | null; estudiante: string }[];
  alertas: { estudianteId: string; nombre: string; codigo: string; seccion: string; faltas: number; nivel: "ALERTA" | "EN_RIESGO" }[];
}
interface PanelDocente {
  rol: "DOCENTE"; docente: { nombre: string; especialidad: string } | null; diaHoy: Dia | null;
  clasesHoy: { id: string; curso: string; seccion: string; horaInicio: string; horaFin: string; aula: string }[];
  totalBloques: number; secciones: { id: string; nombre: string; matriculados: number; capacidadMaxima: number }[];
}
interface PanelFamilia {
  rol: "APODERADO_ESTUDIANTE";
  estudiantes: { id: string; nombre: string; codigo: string; estado: string; seccion: string; asistenciaPorcentaje: number | null; faltasInjustificadas: number; pagosPendientes: number; montoPendiente: number; pagosVencidos: number }[];
}
type Datos = Ejecutivo | PanelDocente | PanelFamilia;

export default function DashboardPage() {
  const { data, loading, error, reload } = useApi<Datos>("/api/dashboard");
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox mensaje={error ?? "No se pudo cargar el dashboard."} onRetry={reload} />;
  if (data.rol === "DOCENTE") return <VistaDocente d={data} />;
  if (data.rol === "APODERADO_ESTUDIANTE") return <VistaFamilia d={data} />;
  return <VistaEjecutiva d={data} />;
}

function VistaEjecutiva({ d }: { d: Ejecutivo }) {
  const k = d.kpis;
  const totalCobranza = k.recaudado + k.pendiente;
  return (
    <>
      <PageHeader titulo="Dashboard Ejecutivo" subtitulo="Indicadores en tiempo real de la Sede Huancayo — año académico 2026" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard titulo="Estudiantes matriculados" valor={k.matriculados} detalle={`Matrículas activas de ${k.capacidadTotal} cupos`} icon={<GraduationCap size={24} />} />
        <StatCard titulo="Vacantes disponibles" valor={k.vacantes} detalle="Suma de cupos libres por sección" icon={<Users size={24} />} color="red" />
        <StatCard titulo="Asistencia del periodo" valor={k.asistenciaPorcentaje === null ? "—" : `${k.asistenciaPorcentaje}%`} detalle="Presentes + tardanzas / registros" icon={<Percent size={24} />} color="green" />
        <StatCard titulo="Recaudado vs. pendiente" valor={formatSoles(k.recaudado)} detalle={<>Saldo pendiente: <b className="text-red-700">{formatSoles(k.pendiente)}</b> (vencido {formatSoles(k.vencido)})</>} icon={<Wallet size={24} />} color="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <h2 className="mb-4 font-bold text-blue-950">Ocupación de vacantes por sección</h2>
          <div className="space-y-4">
            {d.ocupacion.map((s) => {
              const pct = Math.round((s.matriculados / s.capacidadMaxima) * 100);
              return (
                <div key={s.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.nombre}</span>
                    <span className="text-slate-500"><b className="text-slate-800">{s.matriculados}</b> / {s.capacidadMaxima} · <span className={s.vacantes === 0 ? "font-bold text-red-700" : "text-emerald-700"}>{s.vacantes === 0 ? "Sin vacantes" : `${s.vacantes} libres`}</span></span>
                  </div>
                  <Barra valor={s.matriculados} max={s.capacidadMaxima} color={pct >= 100 ? "bg-red-700" : pct >= 80 ? "bg-amber-600" : "bg-blue-950"} />
                </div>
              );
            })}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Cobranza del año</p>
            <div className="flex h-4 overflow-hidden rounded-full bg-slate-200">
              <div className="bg-emerald-600" style={{ width: `${totalCobranza ? (k.recaudado / totalCobranza) * 100 : 0}%` }} />
              <div className="bg-red-700" style={{ width: `${totalCobranza ? (k.vencido / totalCobranza) * 100 : 0}%` }} />
              <div className="bg-amber-600" style={{ width: `${totalCobranza ? ((k.pendiente - k.vencido) / totalCobranza) * 100 : 0}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />Pagado</span>
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-700" />Vencido</span>
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />Pendiente</span>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-blue-950"><AlertTriangle size={18} className="text-amber-600" /> Alertas de inasistencias</h2>
          {d.alertas.length === 0 ? <Empty texto="Sin estudiantes con faltas injustificadas acumuladas." icon={<CheckCircle2 className="text-emerald-600" />} /> : (
            <ul className="space-y-3">
              {d.alertas.map((a) => (
                <li key={a.estudianteId} className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{a.nombre}</p><p className="truncate text-xs text-slate-500">{a.seccion} · {a.codigo}</p></div>
                  <div className="text-right"><Badge valor={a.nivel} /><p className="mt-1 text-xs text-slate-500">{a.faltas} faltas inj.</p></div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-slate-400">Se genera alerta automática al llegar a 3 faltas injustificadas.</p>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"><h2 className="font-bold text-blue-950">Últimos pagos confirmados</h2><Link href="/pagos" className="text-sm font-semibold text-red-700 hover:underline">Ver todos</Link></div>
        <div className="overflow-x-auto">
          <table className="tabla">
            <thead><tr><th>Recibo</th><th>Operación</th><th>Estudiante</th><th>Concepto</th><th>Fecha</th><th className="text-right">Monto</th></tr></thead>
            <tbody>
              {d.ultimosPagos.length === 0 && <tr><td colSpan={6}><Empty texto="Aún no hay pagos confirmados." /></td></tr>}
              {d.ultimosPagos.map((p) => (
                <tr key={p.id}><td className="font-mono text-xs">{p.codigoRecibo}</td><td className="font-mono text-xs">{p.codigoOperacion}</td><td>{p.estudiante}</td><td>{p.concepto}</td><td>{formatFechaHora(p.fechaPago)}</td><td className="text-right font-semibold">{formatSoles(p.monto)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function VistaDocente({ d }: { d: PanelDocente }) {
  return (
    <>
      <PageHeader titulo={`Bienvenido, ${d.docente?.nombre ?? "docente"}`} subtitulo={d.docente ? `Especialidad: ${d.docente.especialidad}` : "Su cuenta no está vinculada a un perfil docente."} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard titulo="Clases hoy" valor={d.clasesHoy.length} detalle={d.diaHoy ? DIA_LABEL[d.diaHoy] : "Fin de semana"} icon={<CalendarClock size={24} />} />
        <StatCard titulo="Bloques semanales" valor={d.totalBloques} detalle="Asignados en su horario" icon={<ClipboardCheck size={24} />} color="red" />
        <StatCard titulo="Secciones a cargo" valor={d.secciones.length} icon={<Users size={24} />} color="amber" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-blue-950">Clases de hoy</h2>
          {d.clasesHoy.length === 0 ? <Empty texto="No tiene clases programadas para hoy." /> : (
            <ul className="space-y-3">{d.clasesHoy.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div><p className="text-sm font-semibold">{c.curso}</p><p className="text-xs text-slate-500">{c.seccion} · {c.aula}</p></div>
                <span className="rounded-md bg-blue-950 px-2 py-1 text-xs font-bold text-white">{c.horaInicio} – {c.horaFin}</span>
              </li>))}</ul>
          )}
          <Link href="/asistencia" className="btn btn-primary mt-4 w-full">Registrar asistencia</Link>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-blue-950">Mis secciones</h2>
          <ul className="space-y-3">{d.secciones.map((s) => (
            <li key={s.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{s.nombre}</span><span className="text-slate-500">{s.matriculados}/{s.capacidadMaxima} estudiantes</span></div><Barra valor={s.matriculados} max={s.capacidadMaxima} /></li>
          ))}</ul>
        </section>
      </div>
    </>
  );
}

function VistaFamilia({ d }: { d: PanelFamilia }) {
  return (
    <>
      <PageHeader titulo="Portal Familiar" subtitulo="Resumen académico y de pagos de sus estudiantes" />
      {d.estudiantes.length === 0 && <Empty texto="No hay estudiantes vinculados a su cuenta." />}
      <div className="grid gap-5 lg:grid-cols-2">
        {d.estudiantes.map((e) => (
          <section key={e.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="text-lg font-bold text-blue-950">{e.nombre}</h2><p className="text-sm text-slate-500">{e.codigo} · {e.seccion}</p></div>
              <Badge valor={e.estado} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xl font-bold text-emerald-700">{e.asistenciaPorcentaje === null ? "—" : `${e.asistenciaPorcentaje}%`}</p><p className="text-[11px] text-slate-500">Asistencia</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className={`text-xl font-bold ${e.faltasInjustificadas >= 2 ? "text-red-700" : "text-slate-800"}`}>{e.faltasInjustificadas}</p><p className="text-[11px] text-slate-500">Faltas injust.</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xl font-bold text-amber-700">{formatSoles(e.montoPendiente)}</p><p className="text-[11px] text-slate-500">{e.pagosPendientes} recibo(s) pend.</p></div>
            </div>
            {e.pagosVencidos > 0 && <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"><AlertTriangle size={16} /> Tiene {e.pagosVencidos} recibo(s) vencido(s).</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/pagos" className="btn btn-primary btn-sm">Ver estado de cuenta</Link>
              <Link href="/asistencia" className="btn btn-outline btn-sm">Asistencias</Link>
              <Link href="/horarios" className="btn btn-outline btn-sm">Horario</Link>
              <Link href="/documentos" className="btn btn-outline btn-sm">Constancias</Link>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
