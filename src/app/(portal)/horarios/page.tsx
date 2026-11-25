"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api, useApi } from "@/lib/client";
import type { Curso, Docente, Horario, Seccion } from "@/lib/tipos";
import { Campo, Empty, ErrorBox, Modal, PageHeader, Spinner, useToast } from "@/components/ui";
import { DIAS, DIA_LABEL, nombreSeccion } from "@/lib/utils";
import { useSesion } from "@/components/useSesion";

const VACIO = { seccionId: "", cursoId: "", docenteId: "", diaSemana: "LUNES", horaInicio: "08:00", horaFin: "09:30", aula: "" };
const COLORES = ["bg-blue-100 border-blue-300 text-blue-950", "bg-red-50 border-red-200 text-red-900", "bg-amber-50 border-amber-300 text-amber-900", "bg-emerald-50 border-emerald-300 text-emerald-900", "bg-violet-50 border-violet-300 text-violet-900", "bg-cyan-50 border-cyan-300 text-cyan-900", "bg-rose-50 border-rose-300 text-rose-900", "bg-lime-50 border-lime-300 text-lime-900"];

export default function HorariosPage() {
  const user = useSesion();
  const toast = useToast();
  const esAdmin = user?.rol === "ADMINISTRADOR";
  const verFiltro = user?.rol === "ADMINISTRADOR" || user?.rol === "ADMINISTRATIVO";
  const [modo, setModo] = useState<"seccion" | "docente">("seccion");
  const [valor, setValor] = useState("");

  const secciones = useApi<Seccion[]>(user ? "/api/secciones" : null);
  const docentes = useApi<Docente[]>(verFiltro ? "/api/docentes" : null);
  const cursos = useApi<Curso[]>(verFiltro ? "/api/cursos" : null);

  useEffect(() => {
    if (!valor && modo === "seccion" && secciones.data?.[0] && user?.rol !== "DOCENTE") setValor(secciones.data[0].id);
  }, [secciones.data, modo, valor, user]);

  const url = !user ? null
    : user.rol === "DOCENTE" ? "/api/horarios"
    : valor ? `/api/horarios?${modo === "seccion" ? "seccionId" : "docenteId"}=${valor}` : null;
  const { data, loading, error, reload } = useApi<Horario[]>(url);

  const [edit, setEdit] = useState<(typeof VACIO & { id?: string }) | null>(null);
  const [errForm, setErrForm] = useState<string | null>(null);

  const franjas = useMemo(() => Array.from(new Set((data ?? []).map((h) => `${h.horaInicio}-${h.horaFin}`))).sort(), [data]);
  const colorCurso = useMemo(() => {
    const ids = Array.from(new Set((data ?? []).map((h) => h.cursoId)));
    return new Map(ids.map((id, i) => [id, COLORES[i % COLORES.length]]));
  }, [data]);

  async function guardar() {
    if (!edit) return;
    setErrForm(null);
    try {
      const { id, ...cuerpo } = edit;
      if (id) await api(`/api/horarios/${id}`, { method: "PUT", json: cuerpo }); else await api("/api/horarios", { method: "POST", json: cuerpo });
      toast.ok(id ? "Bloque horario actualizado." : "Bloque horario asignado sin cruces.");
      setEdit(null); reload();
    } catch (e) { setErrForm((e as Error).message); }
  }
  async function eliminar(h: Horario) {
    if (!confirm(`¿Eliminar el bloque de ${h.curso.nombre} (${DIA_LABEL[h.diaSemana as keyof typeof DIA_LABEL]} ${h.horaInicio})?`)) return;
    try { await api(`/api/horarios/${h.id}`, { method: "DELETE" }); toast.ok("Bloque eliminado."); reload(); } catch (e) { toast.error((e as Error).message); }
  }
  const set = (k: string, v: string) => setEdit((s) => (s ? { ...s, [k]: v } : s));
  const nuevo = () => { setErrForm(null); setEdit({ ...VACIO, seccionId: modo === "seccion" ? valor : secciones.data?.[0]?.id ?? "", docenteId: modo === "docente" ? valor : "" }); };

  return (
    <>
      <PageHeader titulo={user?.rol === "DOCENTE" ? "Mi horario semanal" : "Horarios"} subtitulo="Cuadrícula semanal de lunes a viernes — turno mañana"
        acciones={esAdmin ? <button className="btn btn-primary" onClick={nuevo}><Plus size={16} /> Asignar bloque</button> : undefined} />

      {user?.rol !== "DOCENTE" && (
        <div className="no-print mb-4 flex flex-wrap items-center gap-3">
          {verFiltro && (
            <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm font-semibold">
              {(["seccion", "docente"] as const).map((m) => (
                <button key={m} onClick={() => { setModo(m); setValor(m === "seccion" ? secciones.data?.[0]?.id ?? "" : docentes.data?.[0]?.id ?? ""); }}
                  className={`rounded-md px-3 py-1.5 ${modo === m ? "bg-blue-950 text-white" : "text-slate-600"}`}>Por {m === "seccion" ? "sección" : "docente"}</button>
              ))}
            </div>
          )}
          <select className="input w-auto min-w-[240px]" value={valor} onChange={(e) => setValor(e.target.value)}>
            {modo === "seccion" ? secciones.data?.map((s) => <option key={s.id} value={s.id}>{nombreSeccion(s)}</option>) : docentes.data?.map((d) => <option key={d.id} value={d.id}>{d.apellidos}, {d.nombres} — {d.especialidad}</option>)}
          </select>
        </div>
      )}

      {loading ? <Spinner /> : error ? <ErrorBox mensaje={error} onRetry={reload} /> : !data || data.length === 0 ? <div className="card"><Empty texto="No hay bloques horarios para la selección actual." /></div> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead><tr><th className="w-28 border-b border-slate-200 bg-slate-50 p-3 text-left text-xs uppercase text-slate-500">Hora</th>{DIAS.map((d) => <th key={d} className="border-b border-l border-slate-200 bg-slate-50 p-3 text-xs uppercase tracking-wide text-blue-950">{DIA_LABEL[d]}</th>)}</tr></thead>
            <tbody>
              {franjas.map((f) => (
                <tr key={f}>
                  <td className="border-b border-slate-100 p-3 align-top text-xs font-bold text-slate-600">{f.replace("-", " – ")}</td>
                  {DIAS.map((d) => {
                    const bloques = data.filter((h) => h.diaSemana === d && `${h.horaInicio}-${h.horaFin}` === f);
                    return (
                      <td key={d} className="h-24 border-b border-l border-slate-100 p-1.5 align-top">
                        {bloques.map((h) => (
                          <div key={h.id} className={`group relative mb-1 rounded-lg border p-2 text-xs ${colorCurso.get(h.cursoId)}`}>
                            <p className="font-bold">{h.curso.nombre}</p>
                            <p>{modo === "docente" || user?.rol === "DOCENTE" ? nombreSeccion(h.seccion) : `${h.docente.nombres.split(" ")[0]} ${h.docente.apellidos.split(" ")[0]}`}</p>
                            <p className="opacity-70">{h.aula}</p>
                            {esAdmin && (
                              <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                                <button className="rounded bg-white/90 p-1 hover:bg-white" onClick={() => { setErrForm(null); setEdit({ id: h.id, seccionId: h.seccionId, cursoId: h.cursoId, docenteId: h.docenteId, diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin, aula: h.aula }); }} title="Editar"><Pencil size={12} /></button>
                                <button className="rounded bg-white/90 p-1 text-red-700 hover:bg-white" onClick={() => eliminar(h)} title="Eliminar"><Trash2 size={12} /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar bloque horario" : "Asignar bloque horario"} size="lg"
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}>Guardar bloque</button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Sección"><select className="input" value={edit.seccionId} onChange={(e) => set("seccionId", e.target.value)}><option value="">Seleccione…</option>{secciones.data?.map((s) => <option key={s.id} value={s.id}>{nombreSeccion(s)}</option>)}</select></Campo>
            <Campo label="Curso"><select className="input" value={edit.cursoId} onChange={(e) => set("cursoId", e.target.value)}><option value="">Seleccione…</option>{cursos.data?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Campo>
            <Campo label="Docente" className="sm:col-span-2"><select className="input" value={edit.docenteId} onChange={(e) => set("docenteId", e.target.value)}><option value="">Seleccione…</option>{docentes.data?.filter((d) => d.estado === "ACTIVO").map((d) => <option key={d.id} value={d.id}>{d.apellidos}, {d.nombres} — {d.especialidad}</option>)}</select></Campo>
            <Campo label="Día"><select className="input" value={edit.diaSemana} onChange={(e) => set("diaSemana", e.target.value)}>{DIAS.map((d) => <option key={d} value={d}>{DIA_LABEL[d]}</option>)}</select></Campo>
            <Campo label="Aula"><input className="input" value={edit.aula} onChange={(e) => set("aula", e.target.value)} placeholder="Aula 101" /></Campo>
            <Campo label="Hora de inicio"><input type="time" className="input" value={edit.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} /></Campo>
            <Campo label="Hora de fin"><input type="time" className="input" value={edit.horaFin} onChange={(e) => set("horaFin", e.target.value)} /></Campo>
            {errForm && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 sm:col-span-2">⚠ {errForm}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
