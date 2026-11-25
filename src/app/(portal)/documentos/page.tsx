"use client";

import { useState } from "react";
import { Download, Eye, FilePlus2, FileText, Trash2, Upload } from "lucide-react";
import { api, useApi } from "@/lib/client";
import type { Documento, Estudiante, Seccion } from "@/lib/tipos";
import { Badge, Campo, Empty, ErrorBox, Modal, PageHeader, Spinner, useToast } from "@/components/ui";
import { DocumentoGenerado } from "@/components/Documentos";
import { TIPOS_DOCUMENTO, TIPO_DOC_LABEL, formatFechaHora, nombreSeccion, type TipoDocumento } from "@/lib/utils";
import { useSesion } from "@/components/useSesion";

const GEN_LABEL: Record<string, "MATRICULA" | "ESTUDIOS" | "ESTADO_CUENTA"> = { "gen:MATRICULA": "MATRICULA", "gen:ESTUDIOS": "ESTUDIOS", "gen:ESTADO_CUENTA": "ESTADO_CUENTA" };

export default function DocumentosPage() {
  const user = useSesion();
  const toast = useToast();
  const [tipo, setTipo] = useState("");
  const [seccionId, setSeccionId] = useState("");
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useApi<Documento[]>(user ? `/api/documentos?tipo=${tipo}&seccionId=${seccionId}&q=${encodeURIComponent(q)}` : null);
  const secciones = useApi<Seccion[]>(user ? "/api/secciones" : null);
  const estudiantes = useApi<Estudiante[]>(user && user.rol !== "DOCENTE" ? "/api/estudiantes" : null);
  const [ver, setVer] = useState<Documento | null>(null);
  const [subir, setSubir] = useState(false);
  const [emitir, setEmitir] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({ titulo: "", tipo: "SILABO", descripcion: "", seccionId: "", estudianteId: "" });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [gen, setGen] = useState({ generar: "CONSTANCIA_MATRICULA", estudianteId: "" });

  const esDocente = user?.rol === "DOCENTE";
  const esFamilia = user?.rol === "APODERADO_ESTUDIANTE";
  const puedeSubir = !!user && !esFamilia;

  async function subirDoc() {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("titulo", form.titulo); fd.set("tipo", esDocente ? "SILABO" : form.tipo); fd.set("descripcion", form.descripcion);
      if (form.seccionId) fd.set("seccionId", form.seccionId);
      if (form.estudianteId) fd.set("estudianteId", form.estudianteId);
      if (archivo) fd.set("archivo", archivo);
      await api("/api/documentos", { method: "POST", body: fd });
      toast.ok("Documento registrado correctamente."); setSubir(false); setArchivo(null); setForm({ titulo: "", tipo: "SILABO", descripcion: "", seccionId: "", estudianteId: "" }); reload();
    } catch (e) { toast.error((e as Error).message); } finally { setEnviando(false); }
  }
  async function emitirDoc() {
    setEnviando(true);
    try {
      const d = await api<Documento>("/api/documentos", { method: "POST", json: gen });
      toast.ok("Documento emitido."); setEmitir(false); reload(); setVer({ ...d, subidoPor: "", seccionNombre: null, estudiante: null });
    } catch (e) { toast.error((e as Error).message); } finally { setEnviando(false); }
  }
  async function eliminar(d: Documento) {
    if (!confirm(`¿Eliminar «${d.titulo}»?`)) return;
    try { await api(`/api/documentos/${d.id}`, { method: "DELETE" }); toast.ok("Documento eliminado."); reload(); } catch (e) { toast.error((e as Error).message); }
  }
  function abrir(d: Documento) {
    if (d.rutaArchivo?.startsWith("gen:")) setVer(d);
    else if (d.rutaArchivo) window.open(d.rutaArchivo, "_blank");
    else toast.info("Este registro no tiene archivo adjunto.");
  }
  const puedeEliminar = (d: Documento) => user?.rol === "ADMINISTRADOR" || user?.rol === "ADMINISTRATIVO" || (esDocente && d.subidoPorId === user?.id);

  return (
    <>
      <PageHeader titulo="Gestión Documental" subtitulo="Sílabos, comunicados, constancias y estados de cuenta"
        acciones={<>
          {!esDocente && <button className="btn btn-outline" onClick={() => { setGen({ generar: "CONSTANCIA_MATRICULA", estudianteId: estudiantes.data?.[0]?.id ?? "" }); setEmitir(true); }}><FilePlus2 size={16} /> Emitir constancia / estado de cuenta</button>}
          {puedeSubir && <button className="btn btn-primary" onClick={() => setSubir(true)}><Upload size={16} /> {esDocente ? "Subir sílabo" : "Subir documento"}</button>}
        </>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="input min-w-[200px] flex-1" placeholder="Buscar por título o descripción…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Todos los tipos</option>{TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{TIPO_DOC_LABEL[t]}</option>)}</select>
        <select className="input w-auto" value={seccionId} onChange={(e) => setSeccionId(e.target.value)}><option value="">Todas las secciones</option>{secciones.data?.map((s) => <option key={s.id} value={s.id}>{nombreSeccion(s)}</option>)}</select>
      </div>
      {loading ? <Spinner /> : error ? <ErrorBox mensaje={error} onRetry={reload} /> : (
        <div className="card overflow-x-auto"><table className="tabla">
          <thead><tr><th>Documento</th><th>Tipo</th><th>Sección / Estudiante</th><th>Registrado por</th><th>Fecha</th><th /></tr></thead>
          <tbody>
            {data?.length === 0 && <tr><td colSpan={6}><Empty texto="No hay documentos con los filtros aplicados." icon={<FileText />} /></td></tr>}
            {data?.map((d) => (
              <tr key={d.id}>
                <td><p className="font-medium">{d.titulo}</p><p className="text-xs text-slate-500">{d.descripcion}</p></td>
                <td><Badge valor={d.tipo === "SILABO" ? "INFO" : d.tipo === "COMUNICADO" ? "ALERTA" : "EXITO"} texto={TIPO_DOC_LABEL[d.tipo as TipoDocumento]} /></td>
                <td className="text-xs">{d.seccionNombre ?? "—"}{d.estudiante && <><br />{d.estudiante.apellidos}, {d.estudiante.nombres}</>}</td>
                <td className="text-xs">{d.subidoPor}</td><td className="text-xs">{formatFechaHora(d.createdAt)}</td>
                <td><div className="flex justify-end gap-1">
                  <button className="btn btn-outline btn-sm" onClick={() => abrir(d)}>{d.rutaArchivo?.startsWith("gen:") ? <><Eye size={14} /> Ver / imprimir</> : <><Download size={14} /> Abrir</>}</button>
                  {puedeEliminar(d) && <button className="btn btn-ghost btn-sm text-red-700" onClick={() => eliminar(d)} title="Eliminar"><Trash2 size={14} /></button>}
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
      )}

      <Modal open={!!ver} onClose={() => setVer(null)} title={ver?.titulo ?? "Documento"} size="lg">
        {ver?.estudianteId && ver.rutaArchivo && GEN_LABEL[ver.rutaArchivo] && <DocumentoGenerado tipo={GEN_LABEL[ver.rutaArchivo]} estudianteId={ver.estudianteId} />}
      </Modal>

      <Modal open={subir} onClose={() => setSubir(false)} title={esDocente ? "Subir sílabo" : "Subir documento"} size="lg"
        footer={<><button className="btn btn-outline" onClick={() => setSubir(false)}>Cancelar</button><button className="btn btn-primary" onClick={subirDoc} disabled={enviando}>{enviando ? "Subiendo…" : "Guardar"}</button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Título" className="sm:col-span-2"><input className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Campo>
          {!esDocente && <Campo label="Tipo"><select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{TIPO_DOC_LABEL[t]}</option>)}</select></Campo>}
          <Campo label="Sección"><select className="input" value={form.seccionId} onChange={(e) => setForm({ ...form, seccionId: e.target.value })}><option value="">{esDocente ? "Seleccione…" : "— Todas / ninguna —"}</option>{secciones.data?.map((s) => <option key={s.id} value={s.id}>{nombreSeccion(s)}</option>)}</select></Campo>
          {!esDocente && <Campo label="Estudiante (opcional)"><select className="input" value={form.estudianteId} onChange={(e) => setForm({ ...form, estudianteId: e.target.value })}><option value="">— Ninguno —</option>{estudiantes.data?.map((e) => <option key={e.id} value={e.id}>{e.apellidos}, {e.nombres}</option>)}</select></Campo>}
          <Campo label="Descripción" className="sm:col-span-2"><textarea className="input" rows={2} maxLength={400} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></Campo>
          <Campo label="Archivo (PDF, Word, Excel, PowerPoint, imagen o texto — máx. 10 MB)" className="sm:col-span-2"><input type="file" className="input" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} /></Campo>
        </div>
      </Modal>

      <Modal open={emitir} onClose={() => setEmitir(false)} title="Emitir documento institucional"
        footer={<><button className="btn btn-outline" onClick={() => setEmitir(false)}>Cancelar</button><button className="btn btn-primary" onClick={emitirDoc} disabled={enviando || !gen.estudianteId}>{enviando ? "Emitiendo…" : "Emitir"}</button></>}>
        <div className="grid gap-4">
          <Campo label="Documento"><select className="input" value={gen.generar} onChange={(e) => setGen({ ...gen, generar: e.target.value })}><option value="CONSTANCIA_MATRICULA">Constancia de Matrícula</option><option value="CONSTANCIA_ESTUDIOS">Constancia de Estudios</option><option value="ESTADO_CUENTA">Estado de Cuenta</option></select></Campo>
          <Campo label="Estudiante"><select className="input" value={gen.estudianteId} onChange={(e) => setGen({ ...gen, estudianteId: e.target.value })}><option value="">Seleccione…</option>{estudiantes.data?.filter((e) => gen.generar === "ESTADO_CUENTA" || e.estado === "MATRICULADO").map((e) => <option key={e.id} value={e.id}>{e.apellidos}, {e.nombres} ({e.codigoEstudiante})</option>)}</select></Campo>
        </div>
      </Modal>
    </>
  );
}
