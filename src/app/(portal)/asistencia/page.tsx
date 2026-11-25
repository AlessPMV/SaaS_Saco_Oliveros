"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCheck, Save } from "lucide-react";
import { api, useApi } from "@/lib/client";
import type { Seccion } from "@/lib/tipos";
import { Badge, Empty, ErrorBox, PageHeader, Spinner, Tabs, useToast } from "@/components/ui";
import { ASISTENCIA_LABEL, ESTADOS_ASISTENCIA, fechaISO, formatFecha, nombreSeccion, type EstadoAsistencia } from "@/lib/utils";
import { useSesion } from "@/components/useSesion";

interface Fila { id: string; dni: string; codigoEstudiante: string; nombres: string; apellidos: string; nombreApoderado: string; telefonoApoderado: string; estado: EstadoAsistencia | null; observacion: string; faltasInjustificadas: number }
interface Registro { seccion: { id: string; nombre: string }; fecha: string; estudiantes: Fila[] }
interface Reporte { estudianteId: string; codigoEstudiante: string; nombres: string; apellidos: string; seccion: string; PRESENTE: number; TARDANZA: number; FALTA_INJUSTIFICADA: number; FALTA_JUSTIFICADA: number; alerta: boolean }
interface Familia { id: string; nombres: string; apellidos: string; codigoEstudiante: string; total: number; PRESENTE: number; TARDANZA: number; FALTA_INJUSTIFICADA: number; FALTA_JUSTIFICADA: number; porcentaje: number | null; ultimos: { fecha: string; estado: EstadoAsistencia; observacion: string | null; seccion: string }[] }

type Tab = "registro" | "reporte" | "lista";

export default function AsistenciaPage() {
  const user = useSesion();
  if (!user) return <Spinner />;
  if (user.rol === "APODERADO_ESTUDIANTE") return <VistaFamilia />;
  return <VistaPersonal puedeRegistrar={user.rol === "ADMINISTRADOR" || user.rol === "DOCENTE"} />;
}

function VistaPersonal({ puedeRegistrar }: { puedeRegistrar: boolean }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("registro");
  const secciones = useApi<Seccion[]>("/api/secciones");
  const [seccionId, setSeccionId] = useState("");
  const [fecha, setFecha] = useState(fechaISO());
  useEffect(() => { if (!seccionId && secciones.data?.[0]) setSeccionId(secciones.data[0].id); }, [secciones.data, seccionId]);

  const reg = useApi<Registro>(tab !== "reporte" && seccionId ? `/api/asistencia?seccionId=${seccionId}&fecha=${fecha}` : null);
  const rep = useApi<Reporte[]>(tab === "reporte" ? `/api/asistencia?vista=reporte${seccionId ? `&seccionId=${seccionId}` : ""}` : null);
  const [estados, setEstados] = useState<Record<string, { estado: EstadoAsistencia; observacion: string }>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!reg.data) return;
    const m: Record<string, { estado: EstadoAsistencia; observacion: string }> = {};
    reg.data.estudiantes.forEach((e) => { if (e.estado) m[e.id] = { estado: e.estado, observacion: e.observacion ?? "" }; });
    setEstados(m);
  }, [reg.data]);

  const marcarTodos = useCallback(() => {
    const m: typeof estados = {};
    reg.data?.estudiantes.forEach((e) => { m[e.id] = { estado: "PRESENTE", observacion: estados[e.id]?.observacion ?? "" }; });
    setEstados(m);
  }, [reg.data, estados]);

  async function guardar() {
    if (!reg.data) return;
    const sinMarcar = reg.data.estudiantes.filter((e) => !estados[e.id]);
    if (sinMarcar.length > 0) { toast.error(`Falta registrar la asistencia de ${sinMarcar.length} estudiante(s).`); return; }
    setGuardando(true);
    try {
      const r = await api<{ guardados: number; alertas: { nombre: string; faltas: number }[] }>("/api/asistencia", {
        method: "POST",
        json: { seccionId, fecha, registros: reg.data.estudiantes.map((e) => ({ estudianteId: e.id, estado: estados[e.id].estado, observacion: estados[e.id].observacion })) },
      });
      toast.ok(`Asistencia guardada (${r.guardados} registros).`);
      r.alertas.forEach((a) => toast.error(`ALERTA: ${a.nombre} acumula ${a.faltas} faltas injustificadas. Se notificó a Secretaría y al apoderado.`));
      reg.reload();
    } catch (e) { toast.error((e as Error).message); } finally { setGuardando(false); }
  }

  const selector = (
    <div className="no-print mb-4 flex flex-wrap items-end gap-3">
      <div><label className="label">Sección</label>
        <select className="input min-w-[230px]" value={seccionId} onChange={(e) => setSeccionId(e.target.value)}>
          {tab === "reporte" && <option value="">Todas las secciones</option>}
          {secciones.data?.map((s) => <option key={s.id} value={s.id}>{nombreSeccion(s)}</option>)}
        </select></div>
      {tab !== "reporte" && <div><label className="label">Fecha</label><input type="date" className="input" value={fecha} max={fechaISO()} onChange={(e) => setFecha(e.target.value)} /></div>}
    </div>
  );

  return (
    <>
      <PageHeader titulo="Control de Asistencia" subtitulo="Registro diario, listado por sección y reporte acumulado de inasistencias" />
      <Tabs<Tab> activa={tab} onChange={setTab} tabs={[{ id: "registro", label: "Registro diario" }, { id: "lista", label: "Estudiantes de la sección" }, { id: "reporte", label: "Reporte de inasistencias", icon: <AlertTriangle size={16} /> }]} />
      {secciones.data && secciones.data.length === 0 && <Empty texto="No tiene secciones asignadas." />}
      {selector}

      {tab === "registro" && (reg.loading ? <Spinner /> : reg.error ? <ErrorBox mensaje={reg.error} onRetry={reg.reload} /> : reg.data && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-blue-950">{reg.data.seccion.nombre} — {formatFecha(reg.data.fecha)} · {reg.data.estudiantes.length} estudiantes</p>
            {puedeRegistrar ? <div className="flex gap-2"><button className="btn btn-outline btn-sm" onClick={marcarTodos}><CheckCheck size={15} /> Marcar todos Presentes</button><button className="btn btn-primary btn-sm" onClick={guardar} disabled={guardando}><Save size={15} /> {guardando ? "Guardando…" : "Guardar asistencia"}</button></div> : <span className="text-xs text-slate-500">Solo consulta</span>}
          </div>
          <div className="overflow-x-auto"><table className="tabla">
            <thead><tr><th>Código</th><th>Estudiante</th><th>Faltas injust. (año)</th><th>Estado</th><th>Observación</th></tr></thead>
            <tbody>
              {reg.data.estudiantes.length === 0 && <tr><td colSpan={5}><Empty texto="No hay estudiantes matriculados en esta sección." /></td></tr>}
              {reg.data.estudiantes.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-xs">{e.codigoEstudiante}</td><td className="font-medium">{e.apellidos}, {e.nombres}</td>
                  <td><span className={`font-bold ${e.faltasInjustificadas >= 3 ? "text-red-700" : e.faltasInjustificadas === 2 ? "text-amber-600" : "text-slate-600"}`}>{e.faltasInjustificadas}</span>{e.faltasInjustificadas === 2 && <span className="ml-2 text-[11px] text-amber-700">¡una más genera alerta!</span>}</td>
                  <td><select disabled={!puedeRegistrar} className={`input w-auto min-w-[170px] ${estados[e.id]?.estado === "FALTA_INJUSTIFICADA" ? "border-red-400 bg-red-50" : ""}`} value={estados[e.id]?.estado ?? ""} onChange={(ev) => setEstados((s) => ({ ...s, [e.id]: { estado: ev.target.value as EstadoAsistencia, observacion: s[e.id]?.observacion ?? "" } }))}>
                    <option value="" disabled>— Seleccione —</option>{ESTADOS_ASISTENCIA.map((s) => <option key={s} value={s}>{ASISTENCIA_LABEL[s]}</option>)}</select></td>
                  <td><input disabled={!puedeRegistrar || !estados[e.id]} className="input" maxLength={200} placeholder="Opcional" value={estados[e.id]?.observacion ?? ""} onChange={(ev) => setEstados((s) => ({ ...s, [e.id]: { ...s[e.id], observacion: ev.target.value } }))} /></td>
                </tr>
              ))}
            </tbody></table></div>
        </div>
      ))}

      {tab === "lista" && (reg.loading ? <Spinner /> : reg.error ? <ErrorBox mensaje={reg.error} /> : reg.data && (
        <div className="card overflow-x-auto"><table className="tabla">
          <thead><tr><th>Código</th><th>DNI</th><th>Estudiante</th><th>Apoderado</th><th>Teléfono</th></tr></thead>
          <tbody>{reg.data.estudiantes.length === 0 && <tr><td colSpan={5}><Empty texto="Sin estudiantes matriculados." /></td></tr>}
            {reg.data.estudiantes.map((e) => <tr key={e.id}><td className="font-mono text-xs">{e.codigoEstudiante}</td><td>{e.dni}</td><td className="font-medium">{e.apellidos}, {e.nombres}</td><td>{e.nombreApoderado}</td><td>{e.telefonoApoderado}</td></tr>)}</tbody></table></div>
      ))}

      {tab === "reporte" && (rep.loading ? <Spinner /> : rep.error ? <ErrorBox mensaje={rep.error} onRetry={rep.reload} /> : (
        <div className="card overflow-x-auto"><table className="tabla">
          <thead><tr><th>Estudiante</th><th>Sección</th><th>Presente</th><th>Tardanza</th><th>F. justificada</th><th>F. injustificada</th><th>Situación</th></tr></thead>
          <tbody>{rep.data?.length === 0 && <tr><td colSpan={7}><Empty texto="Sin registros." /></td></tr>}
            {rep.data?.map((r) => (
              <tr key={r.estudianteId}><td className="font-medium">{r.apellidos}, {r.nombres}<p className="font-mono text-[11px] text-slate-400">{r.codigoEstudiante}</p></td><td>{r.seccion}</td><td>{r.PRESENTE}</td><td>{r.TARDANZA}</td><td>{r.FALTA_JUSTIFICADA}</td>
                <td className={`font-bold ${r.FALTA_INJUSTIFICADA >= 3 ? "text-red-700" : r.FALTA_INJUSTIFICADA === 2 ? "text-amber-600" : ""}`}>{r.FALTA_INJUSTIFICADA}</td>
                <td>{r.alerta ? <Badge valor="ALERTA" /> : r.FALTA_INJUSTIFICADA === 2 ? <Badge valor="EN_RIESGO" /> : <span className="text-slate-400">Normal</span>}</td></tr>
            ))}</tbody></table></div>
      ))}
    </>
  );
}

function VistaFamilia() {
  const { data, loading, error, reload } = useApi<Familia[]>("/api/asistencia");
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox mensaje={error ?? "Error"} onRetry={reload} />;
  return (
    <>
      <PageHeader titulo="Asistencias e inasistencias" subtitulo="Resumen de sus estudiantes" />
      {data.length === 0 && <Empty texto="No hay estudiantes vinculados a su cuenta." />}
      <div className="grid gap-5 lg:grid-cols-2">
        {data.map((e) => (
          <section key={e.id} className="card p-5">
            <h2 className="font-bold text-blue-950">{e.nombres} {e.apellidos}</h2><p className="mb-3 text-xs text-slate-500">{e.codigoEstudiante} · {e.total} registros · Asistencia {e.porcentaje === null ? "—" : `${e.porcentaje}%`}</p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[["Presente", e.PRESENTE, "text-emerald-700"], ["Tardanza", e.TARDANZA, "text-amber-600"], ["F. justif.", e.FALTA_JUSTIFICADA, "text-blue-700"], ["F. injust.", e.FALTA_INJUSTIFICADA, "text-red-700"]].map(([l, v, c]) => (
                <div key={l as string} className="rounded-lg bg-slate-50 p-2"><p className={`text-lg font-bold ${c}`}>{v as number}</p><p className="text-slate-500">{l as string}</p></div>))}
            </div>
            <table className="tabla mt-4"><thead><tr><th>Fecha</th><th>Estado</th><th>Observación</th></tr></thead>
              <tbody>{e.ultimos.map((u, i) => <tr key={i}><td>{formatFecha(u.fecha)}</td><td><Badge valor={u.estado} /></td><td className="text-xs text-slate-500">{u.observacion ?? "—"}</td></tr>)}</tbody></table>
          </section>
        ))}
      </div>
    </>
  );
}
