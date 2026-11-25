"use client";

import { useState } from "react";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, FileText, Lock, Search, UserPlus } from "lucide-react";
import { api, useApi } from "@/lib/client";
import type { Estudiante, Matricula, Seccion, Pago } from "@/lib/tipos";
import { Badge, Barra, Campo, Empty, ErrorBox, Modal, PageHeader, Spinner, Tabs, useToast } from "@/components/ui";
import { ConstanciaMatricula } from "@/components/Documentos";
import { PrintButton } from "@/components/ui";
import { formatFecha, formatSoles, nombreSeccion } from "@/lib/utils";

type Tab = "vacantes" | "nueva" | "registradas";

export default function MatriculasPage() {
  const [tab, setTab] = useState<Tab>("vacantes");
  const secciones = useApi<Seccion[]>("/api/secciones");
  const [constancia, setConstancia] = useState<Matricula | null>(null);

  return (
    <>
      <PageHeader titulo="Admisión, Vacantes y Matrícula" subtitulo="Control estricto de vacantes sin sobrecupo, matrícula y emisión de constancias" />
      <Tabs<Tab> activa={tab} onChange={setTab} tabs={[
        { id: "vacantes", label: "Monitor de vacantes" },
        { id: "nueva", label: "Nueva matrícula", icon: <UserPlus size={16} /> },
        { id: "registradas", label: "Matrículas registradas", icon: <FileText size={16} /> },
      ]} />
      {tab === "vacantes" && <Monitor secciones={secciones} onMatricular={() => setTab("nueva")} />}
      {tab === "nueva" && <Wizard secciones={secciones} onListo={(m) => { setConstancia(m); }} />}
      {tab === "registradas" && <Registradas onConstancia={setConstancia} onCambio={secciones.reload} />}
      <Modal open={!!constancia} onClose={() => setConstancia(null)} title="Constancia de matrícula" size="lg">
        {constancia && <><ConstanciaMatricula matricula={constancia} /><div className="no-print mt-5 flex justify-end gap-2"><button className="btn btn-outline" onClick={() => setConstancia(null)}>Cerrar</button><PrintButton /></div></>}
      </Modal>
    </>
  );
}

function Monitor({ secciones, onMatricular }: { secciones: ReturnType<typeof useApi<Seccion[]>>; onMatricular: () => void }) {
  const { data, loading, error, reload } = secciones;
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox mensaje={error ?? "Error al cargar vacantes."} onRetry={reload} />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {data.map((s) => {
        const llena = s.vacantes === 0;
        return (
          <div key={s.id} className={`card p-5 ${llena ? "border-red-300" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.nivel === "PRIMARIA" ? "Primaria" : "Secundaria"}</p><h3 className="font-bold text-blue-950">{s.grado}</h3><p className="text-sm text-slate-600">Sección {s.nombre}</p></div>
              {llena ? <Lock className="text-red-700" size={20} /> : <CheckCircle2 className="text-emerald-600" size={20} />}
            </div>
            <p className={`mt-4 text-4xl font-extrabold ${llena ? "text-red-700" : s.vacantes <= 3 ? "text-amber-600" : "text-emerald-600"}`}>{s.vacantes}</p>
            <p className="mb-3 text-xs text-slate-500">{llena ? "Sin vacantes disponibles" : "cupos disponibles"}</p>
            <Barra valor={s.matriculados} max={s.capacidadMaxima} color={llena ? "bg-red-700" : s.vacantes <= 3 ? "bg-amber-600" : "bg-blue-950"} />
            <p className="mt-1.5 text-xs text-slate-500">{s.matriculados} matriculados de {s.capacidadMaxima}</p>
          </div>
        );
      })}
      <div className="sm:col-span-2 xl:col-span-4"><button className="btn btn-primary" onClick={onMatricular}><UserPlus size={16} /> Registrar nueva matrícula</button></div>
    </div>
  );
}

const NUEVO_VACIO = { dni: "", nombres: "", apellidos: "", fechaNacimiento: "", nombreApoderado: "", telefonoApoderado: "" };

function Wizard({ secciones, onListo }: { secciones: ReturnType<typeof useApi<Seccion[]>>; onListo: (m: Matricula) => void }) {
  const toast = useToast();
  const [paso, setPaso] = useState(1);
  const [modo, setModo] = useState<"existente" | "nuevo">("existente");
  const [estudianteId, setEstudianteId] = useState("");
  const [nuevo, setNuevo] = useState({ ...NUEVO_VACIO });
  const [seccionId, setSeccionId] = useState("");
  const [obs, setObs] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ matricula: Matricula; cargos: Pago[] } | null>(null);
  const [q, setQ] = useState("");
  const postulantes = useApi<Estudiante[]>(`/api/estudiantes?estado=POSTULANTE${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  const lista = secciones.data ?? [];
  const seccion = lista.find((s) => s.id === seccionId);
  const elegido = postulantes.data?.find((p) => p.id === estudianteId);

  function validarPaso1(): string | null {
    if (modo === "existente") return estudianteId ? null : "Seleccione un postulante.";
    if (!/^\d{8}$/.test(nuevo.dni)) return "El DNI debe tener exactamente 8 dígitos.";
    if (!nuevo.nombres.trim() || !nuevo.apellidos.trim()) return "Ingrese nombres y apellidos.";
    if (!nuevo.fechaNacimiento) return "Ingrese la fecha de nacimiento.";
    if (!nuevo.nombreApoderado.trim() || nuevo.telefonoApoderado.trim().length < 7) return "Ingrese el apoderado y un teléfono válido.";
    return null;
  }
  function siguiente() {
    setError(null);
    if (paso === 1) { const v = validarPaso1(); if (v) return setError(v); }
    if (paso === 2 && !seccionId) return setError("Seleccione una sección con vacantes disponibles.");
    setPaso((p) => p + 1);
  }

  async function confirmar() {
    setGuardando(true); setError(null);
    try {
      const r = await api<{ matricula: Matricula; cargos: Pago[] }>("/api/matriculas", {
        method: "POST",
        json: { seccionId, observaciones: obs || undefined, ...(modo === "existente" ? { estudianteId } : { estudiante: nuevo }) },
      });
      setResultado(r);
      toast.ok(`Matrícula ${r.matricula.codigoMatricula} registrada con éxito.`);
      secciones.reload(); postulantes.reload();
    } catch (e) {
      setError((e as Error).message);
      secciones.reload();
    } finally { setGuardando(false); }
  }
  function reiniciar() { setPaso(1); setModo("existente"); setEstudianteId(""); setNuevo({ ...NUEVO_VACIO }); setSeccionId(""); setObs(""); setResultado(null); setError(null); }

  if (resultado) {
    return (
      <div className="card mx-auto max-w-2xl p-6 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
        <h2 className="mt-3 text-xl font-bold text-blue-950">¡Matrícula registrada!</h2>
        <p className="mt-1 text-sm text-slate-600">{resultado.matricula.estudiante.nombres} {resultado.matricula.estudiante.apellidos} fue matriculado en {nombreSeccion(resultado.matricula.seccion)}.</p>
        <p className="mt-1 font-mono text-sm font-bold text-blue-950">{resultado.matricula.codigoMatricula}</p>
        <div className="mx-auto mt-4 max-w-sm rounded-lg bg-slate-50 p-3 text-left text-sm">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Cargos generados</p>
          {resultado.cargos.map((c) => <p key={c.id} className="flex justify-between"><span>{c.concepto}</span><b>{formatSoles(c.monto)}</b></p>)}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="btn btn-primary" onClick={() => onListo(resultado.matricula)}><FileText size={16} /> Ver constancia de matrícula</button>
          <button className="btn btn-outline" onClick={reiniciar}>Registrar otra matrícula</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-3xl p-6">
      <ol className="mb-6 flex items-center gap-2 text-xs font-semibold">
        {["Estudiante", "Sección", "Confirmar"].map((t, i) => (
          <li key={t} className="flex flex-1 items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${paso > i + 1 ? "bg-emerald-600 text-white" : paso === i + 1 ? "bg-blue-950 text-white" : "bg-slate-200 text-slate-500"}`}>{i + 1}</span><span className={paso === i + 1 ? "text-blue-950" : "text-slate-500"}>{t}</span><span className="h-px flex-1 bg-slate-200" /></li>
        ))}
      </ol>

      {paso === 1 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className={`btn flex-1 ${modo === "existente" ? "btn-primary" : "btn-outline"}`} onClick={() => setModo("existente")}>Postulante existente</button>
            <button className={`btn flex-1 ${modo === "nuevo" ? "btn-primary" : "btn-outline"}`} onClick={() => setModo("nuevo")}>Nuevo postulante</button>
          </div>
          {modo === "existente" ? (
            <>
              <div className="relative"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input className="input pl-9" placeholder="Buscar postulante por nombre o DNI…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              {postulantes.loading ? <Spinner /> : (postulantes.data ?? []).length === 0 ? <Empty texto="No hay postulantes pendientes. Registre un nuevo postulante." /> : (
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {postulantes.data!.map((p) => (
                    <li key={p.id}><label className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 ${estudianteId === p.id ? "border-blue-950 bg-blue-950/5" : "border-slate-200"}`}>
                      <input type="radio" name="post" checked={estudianteId === p.id} onChange={() => setEstudianteId(p.id)} />
                      <span className="text-sm"><b>{p.apellidos}, {p.nombres}</b><br /><span className="text-xs text-slate-500">DNI {p.dni} · {p.codigoEstudiante} · Apoderado: {p.nombreApoderado}</span></span></label></li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="DNI (8 dígitos)"><input className="input" maxLength={8} inputMode="numeric" value={nuevo.dni} onChange={(e) => setNuevo({ ...nuevo, dni: e.target.value.replace(/\D/g, "") })} /></Campo>
              <Campo label="Fecha de nacimiento"><input type="date" className="input" value={nuevo.fechaNacimiento} onChange={(e) => setNuevo({ ...nuevo, fechaNacimiento: e.target.value })} /></Campo>
              <Campo label="Nombres"><input className="input" value={nuevo.nombres} onChange={(e) => setNuevo({ ...nuevo, nombres: e.target.value })} /></Campo>
              <Campo label="Apellidos"><input className="input" value={nuevo.apellidos} onChange={(e) => setNuevo({ ...nuevo, apellidos: e.target.value })} /></Campo>
              <Campo label="Nombre del apoderado"><input className="input" value={nuevo.nombreApoderado} onChange={(e) => setNuevo({ ...nuevo, nombreApoderado: e.target.value })} /></Campo>
              <Campo label="Teléfono del apoderado"><input className="input" value={nuevo.telefonoApoderado} onChange={(e) => setNuevo({ ...nuevo, telefonoApoderado: e.target.value })} /></Campo>
            </div>
          )}
        </div>
      )}

      {paso === 2 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {lista.map((s) => {
            const llena = s.vacantes === 0;
            return (
              <button key={s.id} disabled={llena} onClick={() => setSeccionId(s.id)}
                className={`rounded-xl border-2 p-4 text-left transition ${llena ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-70" : seccionId === s.id ? "border-blue-950 bg-blue-950/5" : "border-slate-200 hover:border-slate-400"}`}>
                <div className="flex items-center justify-between"><p className="font-bold text-blue-950">{s.grado}</p>{llena && <Lock size={16} className="text-red-700" />}</div>
                <p className="text-sm text-slate-600">Sección {s.nombre}</p>
                <p className={`mt-2 text-sm font-semibold ${llena ? "text-red-700" : "text-emerald-700"}`}>{llena ? "Sin vacantes — bloqueada" : `${s.vacantes} vacantes disponibles`}</p>
                <p className="text-xs text-slate-500">{s.matriculados}/{s.capacidadMaxima} matriculados</p>
              </button>
            );
          })}
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Estudiante</p>
            <p className="font-bold text-blue-950">{modo === "existente" ? `${elegido?.apellidos}, ${elegido?.nombres}` : `${nuevo.apellidos}, ${nuevo.nombres}`}</p>
            <p className="text-slate-600">DNI {modo === "existente" ? elegido?.dni : nuevo.dni} · Apoderado: {modo === "existente" ? elegido?.nombreApoderado : nuevo.nombreApoderado}</p>
            <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Sección</p>
            <p className="font-bold text-blue-950">{seccion ? nombreSeccion(seccion) : "—"}</p>
          </div>
          <Campo label="Observaciones (opcional)"><textarea className="input" rows={2} maxLength={300} value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Al confirmar se creará la matrícula, el estudiante pasará a «Matriculado», se generarán los cargos <b>Matrícula 2026</b> y <b>Pensión Marzo 2026</b> y se enviará una notificación interna.</p>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex justify-between">
        <button className="btn btn-outline" disabled={paso === 1 || guardando} onClick={() => { setError(null); setPaso((p) => p - 1); }}><ChevronLeft size={16} /> Atrás</button>
        {paso < 3 ? <button className="btn btn-primary" onClick={siguiente}>Siguiente <ChevronRight size={16} /></button>
          : <button className="btn btn-accent" onClick={confirmar} disabled={guardando}>{guardando ? "Registrando…" : "Confirmar matrícula"}</button>}
      </div>
    </div>
  );
}

function Registradas({ onConstancia, onCambio }: { onConstancia: (m: Matricula) => void; onCambio: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const { data, loading, error, reload } = useApi<Matricula[]>(`/api/matriculas?q=${encodeURIComponent(q)}&estado=${estado}`);
  async function anular(m: Matricula) {
    if (!confirm(`¿Anular la matrícula ${m.codigoMatricula}? Se liberará la vacante.`)) return;
    try { await api(`/api/matriculas/${m.id}`, { method: "PATCH", json: { estado: "ANULADA" } }); toast.ok("Matrícula anulada; vacante liberada."); reload(); onCambio(); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input className="input pl-9" placeholder="Buscar por código, nombre o DNI…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input w-auto" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todas</option><option value="ACTIVA">Activas</option><option value="ANULADA">Anuladas</option></select>
      </div>
      {loading ? <Spinner /> : error ? <ErrorBox mensaje={error} onRetry={reload} /> : (
        <div className="card overflow-x-auto"><table className="tabla">
          <thead><tr><th>Código</th><th>Estudiante</th><th>Sección</th><th>Fecha</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {data?.length === 0 && <tr><td colSpan={6}><Empty texto="No hay matrículas registradas." /></td></tr>}
            {data?.map((m) => (
              <tr key={m.id}><td className="font-mono text-xs">{m.codigoMatricula}</td><td className="font-medium">{m.estudiante.apellidos}, {m.estudiante.nombres}</td><td>{nombreSeccion(m.seccion)}</td><td>{formatFecha(m.fechaMatricula)}</td><td><Badge valor={m.estado} /></td>
                <td><div className="flex justify-end gap-1"><button className="btn btn-outline btn-sm" onClick={() => onConstancia(m)}><FileText size={14} /> Constancia</button>{m.estado === "ACTIVA" && <button className="btn btn-danger btn-sm" onClick={() => anular(m)}><Ban size={14} /> Anular</button>}</div></td></tr>
            ))}
          </tbody></table></div>
      )}
    </>
  );
}
