"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Layers, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { api, useApi } from "@/lib/client";
import type { Curso, Docente, Estudiante, Seccion, UsuarioLista } from "@/lib/tipos";
import { Badge, Barra, Campo, Empty, ErrorBox, Modal, PageHeader, Spinner, Tabs, useToast } from "@/components/ui";
import { formatFecha, nombreSeccion } from "@/lib/utils";
import { useSesion } from "@/components/useSesion";

type Tab = "estudiantes" | "docentes" | "cursos" | "secciones";

export default function AcademicoPage() {
  const [tab, setTab] = useState<Tab>("estudiantes");
  const user = useSesion();
  const esAdmin = user?.rol === "ADMINISTRADOR";
  return (
    <>
      <PageHeader titulo="Gestión Académica" subtitulo="Estudiantes, plana docente, catálogo de cursos y secciones" />
      <Tabs<Tab> activa={tab} onChange={setTab} tabs={[
        { id: "estudiantes", label: "Estudiantes", icon: <GraduationCap size={16} /> },
        { id: "docentes", label: "Docentes", icon: <Users size={16} /> },
        { id: "cursos", label: "Cursos", icon: <BookOpen size={16} /> },
        { id: "secciones", label: "Secciones", icon: <Layers size={16} /> },
      ]} />
      {!esAdmin && tab !== "estudiantes" && <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">Solo el Administrador puede crear, editar o eliminar en esta sección. Usted tiene acceso de consulta.</p>}
      {tab === "estudiantes" && <EstudiantesTab />}
      {tab === "docentes" && <DocentesTab editable={esAdmin} />}
      {tab === "cursos" && <CursosTab editable={esAdmin} />}
      {tab === "secciones" && <SeccionesTab editable={esAdmin} />}
    </>
  );
}

function Buscador({ valor, onChange, placeholder, children }: { valor: string; onChange: (v: string) => void; placeholder: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <input className="input pl-9" placeholder={placeholder} value={valor} onChange={(e) => onChange(e.target.value)} /></div>
      {children}
    </div>
  );
}

function useDebounce<T>(valor: T, ms = 300): T {
  const [v, setV] = useState(valor);
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t); }, [valor, ms]);
  return v;
}

function Acciones({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Editar"><Pencil size={15} /></button>
      <button className="btn btn-ghost btn-sm text-red-700" onClick={onDelete} title="Eliminar"><Trash2 size={15} /></button>
    </div>
  );
}

// ═════════════════════════ ESTUDIANTES ═════════════════════════
const EST_VACIO = { dni: "", nombres: "", apellidos: "", fechaNacimiento: "", nombreApoderado: "", telefonoApoderado: "", usuarioApoderadoId: "", estado: "POSTULANTE" };

function EstudiantesTab() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [seccionId, setSeccionId] = useState("");
  const qd = useDebounce(q);
  const params = new URLSearchParams();
  if (qd) params.set("q", qd);
  if (estado) params.set("estado", estado);
  if (seccionId) params.set("seccionId", seccionId);
  const { data, loading, error, reload } = useApi<Estudiante[]>(`/api/estudiantes?${params}`);
  const { data: secciones } = useApi<Seccion[]>("/api/secciones");
  const { data: apoderados } = useApi<UsuarioLista[]>("/api/usuarios?rol=APODERADO_ESTUDIANTE");
  const [edit, setEdit] = useState<(typeof EST_VACIO & { id?: string; codigoEstudiante?: string }) | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!edit) return;
    setGuardando(true);
    try {
      const { id, codigoEstudiante: _c, ...cuerpo } = edit;
      void _c;
      if (id) await api(`/api/estudiantes/${id}`, { method: "PUT", json: cuerpo });
      else await api("/api/estudiantes", { method: "POST", json: cuerpo });
      toast.ok(id ? "Estudiante actualizado correctamente." : "Estudiante registrado. Código generado automáticamente.");
      setEdit(null);
      reload();
    } catch (e) { toast.error((e as Error).message); } finally { setGuardando(false); }
  }
  async function eliminar(e: Estudiante) {
    if (!confirm(`¿Eliminar al estudiante ${e.nombres} ${e.apellidos}?`)) return;
    try { await api(`/api/estudiantes/${e.id}`, { method: "DELETE" }); toast.ok("Estudiante eliminado."); reload(); } catch (err) { toast.error((err as Error).message); }
  }
  const set = (k: string, v: string) => setEdit((s) => (s ? { ...s, [k]: v } : s));

  return (
    <>
      <Buscador valor={q} onChange={setQ} placeholder="Buscar por nombre, DNI o código…">
        <select className="input w-auto" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos los estados</option><option value="POSTULANTE">Postulante</option><option value="MATRICULADO">Matriculado</option><option value="RETIRADO">Retirado</option></select>
        <select className="input w-auto" value={seccionId} onChange={(e) => setSeccionId(e.target.value)}><option value="">Todas las secciones</option>{secciones?.map((s) => <option key={s.id} value={s.id}>{nombreSeccion(s)}</option>)}</select>
        <button className="btn btn-primary" onClick={() => setEdit({ ...EST_VACIO })}><Plus size={16} /> Nuevo estudiante</button>
      </Buscador>
      {loading ? <Spinner /> : error ? <ErrorBox mensaje={error} onRetry={reload} /> : (
        <div className="card overflow-x-auto">
          <table className="tabla">
            <thead><tr><th>Código</th><th>DNI</th><th>Estudiante</th><th>Nacimiento</th><th>Apoderado</th><th>Sección</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {data?.length === 0 && <tr><td colSpan={8}><Empty texto="No se encontraron estudiantes con los filtros aplicados." /></td></tr>}
              {data?.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-xs">{e.codigoEstudiante}</td><td>{e.dni}</td>
                  <td className="font-medium">{e.apellidos}, {e.nombres}</td><td>{formatFecha(e.fechaNacimiento)}</td>
                  <td><p>{e.nombreApoderado}</p><p className="text-xs text-slate-500">{e.telefonoApoderado}</p></td>
                  <td>{e.matriculas?.[0] ? nombreSeccion(e.matriculas[0].seccion) : <span className="text-slate-400">—</span>}</td>
                  <td><Badge valor={e.estado} /></td>
                  <td><Acciones onEdit={() => setEdit({ id: e.id, codigoEstudiante: e.codigoEstudiante, dni: e.dni, nombres: e.nombres, apellidos: e.apellidos, fechaNacimiento: e.fechaNacimiento, nombreApoderado: e.nombreApoderado, telefonoApoderado: e.telefonoApoderado, usuarioApoderadoId: e.usuarioApoderadoId ?? "", estado: e.estado })} onDelete={() => eliminar(e)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar estudiante" : "Nuevo estudiante"} size="lg"
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            {edit.codigoEstudiante && <Campo label="Código de estudiante"><input className="input" value={edit.codigoEstudiante} disabled /></Campo>}
            <Campo label="DNI (8 dígitos)"><input className="input" inputMode="numeric" maxLength={8} value={edit.dni} onChange={(e) => set("dni", e.target.value.replace(/\D/g, ""))} /></Campo>
            <Campo label="Nombres"><input className="input" value={edit.nombres} onChange={(e) => set("nombres", e.target.value)} /></Campo>
            <Campo label="Apellidos"><input className="input" value={edit.apellidos} onChange={(e) => set("apellidos", e.target.value)} /></Campo>
            <Campo label="Fecha de nacimiento"><input type="date" className="input" value={edit.fechaNacimiento} onChange={(e) => set("fechaNacimiento", e.target.value)} /></Campo>
            {edit.id && <Campo label="Estado"><select className="input" value={edit.estado} onChange={(e) => set("estado", e.target.value)}><option value="POSTULANTE">Postulante</option><option value="MATRICULADO">Matriculado</option><option value="RETIRADO">Retirado</option></select></Campo>}
            <Campo label="Nombre del apoderado"><input className="input" value={edit.nombreApoderado} onChange={(e) => set("nombreApoderado", e.target.value)} /></Campo>
            <Campo label="Teléfono del apoderado"><input className="input" value={edit.telefonoApoderado} onChange={(e) => set("telefonoApoderado", e.target.value)} /></Campo>
            <Campo label="Cuenta de apoderado vinculada (portal familiar)" className="sm:col-span-2">
              <select className="input" value={edit.usuarioApoderadoId} onChange={(e) => set("usuarioApoderadoId", e.target.value)}>
                <option value="">— Sin cuenta vinculada —</option>
                {apoderados?.map((a) => <option key={a.id} value={a.id}>{a.nombre} {a.apellidos} ({a.email})</option>)}
              </select>
            </Campo>
            {!edit.id && <p className="text-xs text-slate-500 sm:col-span-2">El código de estudiante (SO-HYO-AAAA-NNN) se genera automáticamente. Para matricular, use el módulo «Admisión y Matrículas».</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

// ═════════════════════════ DOCENTES ═════════════════════════
const DOC_VACIO = { dni: "", nombres: "", apellidos: "", especialidad: "", telefono: "", email: "", estado: "ACTIVO" };

function DocentesTab({ editable }: { editable: boolean }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const qd = useDebounce(q);
  const { data, loading, error, reload } = useApi<Docente[]>(`/api/docentes?q=${encodeURIComponent(qd)}`);
  const [edit, setEdit] = useState<(typeof DOC_VACIO & { id?: string }) | null>(null);
  const set = (k: string, v: string) => setEdit((s) => (s ? { ...s, [k]: v } : s));

  async function guardar() {
    if (!edit) return;
    try {
      const { id, ...cuerpo } = edit;
      if (id) await api(`/api/docentes/${id}`, { method: "PUT", json: cuerpo }); else await api("/api/docentes", { method: "POST", json: cuerpo });
      toast.ok(id ? "Docente actualizado." : "Docente registrado."); setEdit(null); reload();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function eliminar(d: Docente) {
    if (!confirm(`¿Eliminar al docente ${d.nombres} ${d.apellidos}?`)) return;
    try { await api(`/api/docentes/${d.id}`, { method: "DELETE" }); toast.ok("Docente eliminado."); reload(); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <>
      <Buscador valor={q} onChange={setQ} placeholder="Buscar por nombre, DNI o especialidad…">
        {editable && <button className="btn btn-primary" onClick={() => setEdit({ ...DOC_VACIO })}><Plus size={16} /> Nuevo docente</button>}
      </Buscador>
      {loading ? <Spinner /> : error ? <ErrorBox mensaje={error} onRetry={reload} /> : (
        <div className="card overflow-x-auto">
          <table className="tabla">
            <thead><tr><th>DNI</th><th>Docente</th><th>Especialidad</th><th>Contacto</th><th>Bloques</th><th>Estado</th>{editable && <th />}</tr></thead>
            <tbody>
              {data?.length === 0 && <tr><td colSpan={7}><Empty texto="No se encontraron docentes." /></td></tr>}
              {data?.map((d) => (
                <tr key={d.id}>
                  <td>{d.dni}</td><td className="font-medium">{d.apellidos}, {d.nombres}{d.usuario && <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-900">CON USUARIO</span>}</td>
                  <td>{d.especialidad}</td><td><p>{d.email}</p><p className="text-xs text-slate-500">{d.telefono}</p></td>
                  <td>{d._count?.horarios ?? 0}</td><td><Badge valor={d.estado} /></td>
                  {editable && <td><Acciones onEdit={() => setEdit({ id: d.id, dni: d.dni, nombres: d.nombres, apellidos: d.apellidos, especialidad: d.especialidad, telefono: d.telefono, email: d.email, estado: d.estado })} onDelete={() => eliminar(d)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar docente" : "Nuevo docente"} size="lg"
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}>Guardar</button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="DNI (8 dígitos)"><input className="input" maxLength={8} inputMode="numeric" value={edit.dni} onChange={(e) => set("dni", e.target.value.replace(/\D/g, ""))} /></Campo>
            <Campo label="Especialidad"><input className="input" value={edit.especialidad} onChange={(e) => set("especialidad", e.target.value)} placeholder="Ej.: Álgebra" /></Campo>
            <Campo label="Nombres"><input className="input" value={edit.nombres} onChange={(e) => set("nombres", e.target.value)} /></Campo>
            <Campo label="Apellidos"><input className="input" value={edit.apellidos} onChange={(e) => set("apellidos", e.target.value)} /></Campo>
            <Campo label="Correo electrónico"><input type="email" className="input" value={edit.email} onChange={(e) => set("email", e.target.value)} /></Campo>
            <Campo label="Teléfono"><input className="input" value={edit.telefono} onChange={(e) => set("telefono", e.target.value)} /></Campo>
            <Campo label="Estado"><select className="input" value={edit.estado} onChange={(e) => set("estado", e.target.value)}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></Campo>
          </div>
        )}
      </Modal>
    </>
  );
}

// ═════════════════════════ CURSOS ═════════════════════════
const CUR_VACIO = { codigo: "", nombre: "", area: "", horasSemanales: "4" };

function CursosTab({ editable }: { editable: boolean }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const qd = useDebounce(q);
  const { data, loading, error, reload } = useApi<Curso[]>(`/api/cursos?q=${encodeURIComponent(qd)}&area=${encodeURIComponent(area)}`);
  const { data: todos } = useApi<Curso[]>("/api/cursos");
  const areas = useMemo(() => Array.from(new Set((todos ?? []).map((c) => c.area))).sort(), [todos]);
  const [edit, setEdit] = useState<(typeof CUR_VACIO & { id?: string }) | null>(null);
  const set = (k: string, v: string) => setEdit((s) => (s ? { ...s, [k]: v } : s));

  async function guardar() {
    if (!edit) return;
    try {
      const { id, ...cuerpo } = edit;
      if (id) await api(`/api/cursos/${id}`, { method: "PUT", json: cuerpo }); else await api("/api/cursos", { method: "POST", json: cuerpo });
      toast.ok(id ? "Curso actualizado." : "Curso creado."); setEdit(null); reload();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function eliminar(c: Curso) {
    if (!confirm(`¿Eliminar el curso ${c.nombre}?`)) return;
    try { await api(`/api/cursos/${c.id}`, { method: "DELETE" }); toast.ok("Curso eliminado."); reload(); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <>
      <Buscador valor={q} onChange={setQ} placeholder="Buscar por nombre o código…">
        <select className="input w-auto" value={area} onChange={(e) => setArea(e.target.value)}><option value="">Todas las áreas</option>{areas.map((a) => <option key={a}>{a}</option>)}</select>
        {editable && <button className="btn btn-primary" onClick={() => setEdit({ ...CUR_VACIO })}><Plus size={16} /> Nuevo curso</button>}
      </Buscador>
      {loading ? <Spinner /> : error ? <ErrorBox mensaje={error} onRetry={reload} /> : (
        <div className="card overflow-x-auto">
          <table className="tabla">
            <thead><tr><th>Código</th><th>Curso</th><th>Área</th><th>Horas semanales</th><th>Bloques asignados</th>{editable && <th />}</tr></thead>
            <tbody>
              {data?.length === 0 && <tr><td colSpan={6}><Empty texto="No se encontraron cursos." /></td></tr>}
              {data?.map((c) => (
                <tr key={c.id}><td className="font-mono text-xs">{c.codigo}</td><td className="font-medium">{c.nombre}</td><td>{c.area}</td><td>{c.horasSemanales} h</td><td>{c._count?.horarios ?? 0}</td>
                  {editable && <td><Acciones onEdit={() => setEdit({ id: c.id, codigo: c.codigo, nombre: c.nombre, area: c.area, horasSemanales: String(c.horasSemanales) })} onDelete={() => eliminar(c)} /></td>}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar curso" : "Nuevo curso"}
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}>Guardar</button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Código"><input className="input" value={edit.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="ALG-101" /></Campo>
            <Campo label="Horas semanales"><input type="number" min={1} max={40} className="input" value={edit.horasSemanales} onChange={(e) => set("horasSemanales", e.target.value)} /></Campo>
            <Campo label="Nombre del curso" className="sm:col-span-2"><input className="input" value={edit.nombre} onChange={(e) => set("nombre", e.target.value)} /></Campo>
            <Campo label="Área" className="sm:col-span-2"><input className="input" list="areas" value={edit.area} onChange={(e) => set("area", e.target.value)} /><datalist id="areas">{areas.map((a) => <option key={a} value={a} />)}</datalist></Campo>
          </div>
        )}
      </Modal>
    </>
  );
}

// ═════════════════════════ SECCIONES ═════════════════════════
const SEC_VACIA = { nivel: "SECUNDARIA", grado: "", nombre: "", capacidadMaxima: "25" };

function SeccionesTab({ editable }: { editable: boolean }) {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Seccion[]>("/api/secciones");
  const [edit, setEdit] = useState<(typeof SEC_VACIA & { id?: string }) | null>(null);
  const set = (k: string, v: string) => setEdit((s) => (s ? { ...s, [k]: v } : s));

  async function guardar() {
    if (!edit) return;
    try {
      const { id, ...cuerpo } = edit;
      if (id) await api(`/api/secciones/${id}`, { method: "PUT", json: cuerpo }); else await api("/api/secciones", { method: "POST", json: cuerpo });
      toast.ok(id ? "Sección actualizada." : "Sección creada."); setEdit(null); reload();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function eliminar(s: Seccion) {
    if (!confirm(`¿Eliminar la sección ${nombreSeccion(s)}?`)) return;
    try { await api(`/api/secciones/${s.id}`, { method: "DELETE" }); toast.ok("Sección eliminada."); reload(); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <>
      {editable && <div className="mb-4 flex justify-end"><button className="btn btn-primary" onClick={() => setEdit({ ...SEC_VACIA })}><Plus size={16} /> Nueva sección</button></div>}
      {loading ? <Spinner /> : error ? <ErrorBox mensaje={error} onRetry={reload} /> : (
        <div className="card overflow-x-auto">
          <table className="tabla">
            <thead><tr><th>Nivel</th><th>Grado</th><th>Sección</th><th>Turno</th><th>Año</th><th className="min-w-[220px]">Ocupación / vacantes libres</th>{editable && <th />}</tr></thead>
            <tbody>
              {data?.length === 0 && <tr><td colSpan={7}><Empty texto="No hay secciones registradas." /></td></tr>}
              {data?.map((s) => (
                <tr key={s.id}>
                  <td>{s.nivel === "PRIMARIA" ? "Primaria" : "Secundaria"}</td><td className="font-medium">{s.grado}</td><td>{s.nombre}</td><td>{s.turno}</td><td>{s.anioAcademico}</td>
                  <td>
                    <div className="flex items-center gap-3"><div className="w-28"><Barra valor={s.matriculados} max={s.capacidadMaxima} color={s.vacantes === 0 ? "bg-red-700" : s.vacantes <= 3 ? "bg-amber-600" : "bg-emerald-600"} /></div>
                      <span className="text-xs text-slate-600">{s.matriculados}/{s.capacidadMaxima} · <b className={s.vacantes === 0 ? "text-red-700" : "text-emerald-700"}>{s.vacantes === 0 ? "Sin vacantes" : `${s.vacantes} libres`}</b></span></div>
                  </td>
                  {editable && <td><Acciones onEdit={() => setEdit({ id: s.id, nivel: s.nivel, grado: s.grado, nombre: s.nombre, capacidadMaxima: String(s.capacidadMaxima) })} onDelete={() => eliminar(s)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar sección" : "Nueva sección"}
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}>Guardar</button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nivel"><select className="input" value={edit.nivel} onChange={(e) => set("nivel", e.target.value)}><option value="PRIMARIA">Primaria</option><option value="SECUNDARIA">Secundaria</option></select></Campo>
            <Campo label="Capacidad máxima"><input type="number" min={1} max={60} className="input" value={edit.capacidadMaxima} onChange={(e) => set("capacidadMaxima", e.target.value)} /></Campo>
            <Campo label="Grado"><input className="input" value={edit.grado} onChange={(e) => set("grado", e.target.value)} placeholder="Ej.: 2do Secundaria" /></Campo>
            <Campo label="Nombre de la sección"><input className="input" value={edit.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej.: A, Círculo, Pre-U" /></Campo>
            <p className="text-xs text-slate-500 sm:col-span-2">Turno: Mañana · Año académico: 2026. La capacidad no puede ser menor a los estudiantes ya matriculados.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
