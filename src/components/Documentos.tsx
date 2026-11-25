"use client";

import { GraduationCap } from "lucide-react";
import { useApi } from "@/lib/client";
import type { Matricula, Pago } from "@/lib/tipos";
import { COLEGIO, METODO_LABEL, SEDE, formatFecha, formatFechaHora, formatFechaLarga, formatSoles, nombreSeccion } from "@/lib/utils";
import { Badge, ErrorBox, PrintButton, Spinner } from "@/components/ui";

export function MembreteInstitucional({ titulo, codigo }: { titulo: string; codigo?: string }) {
  return (
    <div className="mb-6 border-b-4 border-blue-950 pb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-red-700 bg-blue-950 text-white"><GraduationCap size={34} /></div>
          <div>
            <p className="text-xl font-extrabold uppercase tracking-wide text-blue-950">{COLEGIO}</p>
            <p className="text-sm font-semibold text-red-700">{SEDE} · Junín, Perú</p>
            <p className="text-[11px] text-slate-500">Institución Educativa Privada · Año Académico 2026</p>
          </div>
        </div>
        {codigo && <div className="text-right text-xs text-slate-600"><p className="font-semibold uppercase">N.°</p><p className="font-mono text-sm font-bold text-blue-950">{codigo}</p></div>}
      </div>
      <h2 className="mt-5 text-center text-xl font-bold uppercase tracking-widest text-blue-950">{titulo}</h2>
    </div>
  );
}

function Firmas() {
  return (
    <div className="mt-14 grid grid-cols-2 gap-10 text-center text-xs text-slate-700">
      <div><div className="mx-auto mb-1 w-48 border-t border-slate-700" /><p className="font-semibold">Secretaría Académica</p><p>{SEDE}</p></div>
      <div><div className="mx-auto mb-1 w-48 border-t border-slate-700" /><p className="font-semibold">Dirección de Sede</p><p>{COLEGIO}</p></div>
    </div>
  );
}

function Fila({ k, v }: { k: string; v: React.ReactNode }) {
  return <tr><td className="w-1/3 border border-slate-300 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">{k}</td><td className="border border-slate-300 px-3 py-1.5">{v}</td></tr>;
}

// ───────────── Constancia de Matrícula ─────────────
export function ConstanciaMatricula({ matricula }: { matricula: Matricula }) {
  const e = matricula.estudiante;
  const s = matricula.seccion;
  return (
    <div className="print-area bg-white text-sm text-slate-800">
      <MembreteInstitucional titulo="Constancia de Matrícula" codigo={matricula.codigoMatricula} />
      <p className="mb-4 text-justify leading-relaxed">
        La Dirección de la Sede Huancayo del <b>{COLEGIO}</b> deja constancia que el(la) estudiante <b className="uppercase">{e.apellidos}, {e.nombres}</b>,
        identificado(a) con DNI N.° <b>{e.dni}</b>, se encuentra <b>{matricula.estado === "ACTIVA" ? "MATRICULADO(A)" : "CON MATRÍCULA ANULADA"}</b> en el año académico <b>{s.anioAcademico}</b>, conforme a los datos siguientes:
      </p>
      <table className="w-full border-collapse text-sm"><tbody>
        <Fila k="Código de matrícula" v={<span className="font-mono">{matricula.codigoMatricula}</span>} />
        <Fila k="Código de estudiante" v={<span className="font-mono">{e.codigoEstudiante}</span>} />
        <Fila k="Estudiante" v={`${e.apellidos}, ${e.nombres}`} />
        <Fila k="DNI" v={e.dni} />
        <Fila k="Fecha de nacimiento" v={formatFecha(e.fechaNacimiento)} />
        <Fila k="Nivel / Grado" v={`${s.nivel === "PRIMARIA" ? "Primaria" : "Secundaria"} — ${s.grado}`} />
        <Fila k="Sección / Turno" v={`${s.nombre} / ${s.turno === "MAÑANA" ? "Mañana" : s.turno}`} />
        <Fila k="Apoderado" v={e.nombreApoderado} />
        <Fila k="Teléfono del apoderado" v={e.telefonoApoderado} />
        <Fila k="Fecha de matrícula" v={formatFecha(matricula.fechaMatricula)} />
        <Fila k="Estado" v={matricula.estado === "ACTIVA" ? "Activa" : "Anulada"} />
      </tbody></table>
      {matricula.observaciones && <p className="mt-3 text-xs"><b>Observaciones:</b> {matricula.observaciones}</p>}
      <p className="mt-6 text-right">Huancayo, {formatFechaLarga()}.</p>
      <Firmas />
      <p className="mt-8 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">Documento emitido electrónicamente por el Sistema de Gestión Académica — {COLEGIO}, {SEDE}.</p>
    </div>
  );
}

// ───────────── Documentos generados por estudiante ─────────────
export function DocumentoGenerado({ tipo, estudianteId }: { tipo: "MATRICULA" | "ESTUDIOS" | "ESTADO_CUENTA"; estudianteId: string }) {
  const mats = useApi<Matricula[]>(tipo !== "ESTADO_CUENTA" ? `/api/matriculas?estudianteId=${estudianteId}&estado=ACTIVA` : null);
  const pagos = useApi<Pago[]>(tipo === "ESTADO_CUENTA" ? `/api/pagos?estudianteId=${estudianteId}` : null);

  if (tipo === "ESTADO_CUENTA") {
    if (pagos.loading) return <Spinner />;
    if (pagos.error || !pagos.data) return <ErrorBox mensaje={pagos.error ?? "No se pudo cargar el estado de cuenta."} />;
    const lista = [...pagos.data].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    const est = lista[0]?.estudiante;
    const pagado = lista.filter((p) => p.estado === "PAGADO").reduce((s, p) => s + p.monto, 0);
    const deuda = lista.filter((p) => p.estado !== "PAGADO").reduce((s, p) => s + p.monto, 0);
    return (
      <div>
        <div className="print-area bg-white text-sm text-slate-800">
          <MembreteInstitucional titulo="Estado de Cuenta" />
          {est && <p className="mb-3">Estudiante: <b>{est.apellidos}, {est.nombres}</b> ({est.codigoEstudiante}) · DNI {est.dni} · Apoderado: {est.nombreApoderado}</p>}
          <table className="tabla border border-slate-300"><thead><tr><th>Recibo</th><th>Concepto</th><th>Vence</th><th>Estado</th><th className="text-right">Monto</th></tr></thead>
            <tbody>{lista.map((p) => <tr key={p.id}><td className="font-mono text-xs">{p.codigoRecibo}</td><td>{p.concepto}</td><td>{formatFecha(p.fechaVencimiento)}</td><td><Badge valor={p.estado} /></td><td className="text-right">{formatSoles(p.monto)}</td></tr>)}</tbody></table>
          <div className="mt-4 flex justify-end gap-8 text-sm"><p>Total pagado: <b className="text-emerald-700">{formatSoles(pagado)}</b></p><p>Saldo pendiente: <b className="text-red-700">{formatSoles(deuda)}</b></p></div>
          <p className="mt-6 text-right text-xs">Emitido en Huancayo, {formatFechaLarga()}.</p>
        </div>
        <div className="no-print mt-5 flex justify-end"><PrintButton /></div>
      </div>
    );
  }

  if (mats.loading) return <Spinner />;
  const m = mats.data?.[0];
  if (mats.error || !m) return <ErrorBox mensaje={mats.error ?? "El estudiante no tiene una matrícula activa."} />;
  if (tipo === "MATRICULA") return <div><ConstanciaMatricula matricula={m} /><div className="no-print mt-5 flex justify-end"><PrintButton /></div></div>;

  const e = m.estudiante;
  return (
    <div>
      <div className="print-area bg-white text-sm text-slate-800">
        <MembreteInstitucional titulo="Constancia de Estudios" codigo={`CE-${m.codigoMatricula.slice(4)}`} />
        <p className="text-justify leading-relaxed">
          La Dirección de la Sede Huancayo del <b>{COLEGIO}</b> HACE CONSTAR que <b className="uppercase">{e.apellidos}, {e.nombres}</b>, con DNI N.° <b>{e.dni}</b> y código de estudiante <b>{e.codigoEstudiante}</b>,
          viene cursando estudios regulares en el <b>{m.seccion.grado} — Sección {m.seccion.nombre}</b> del nivel de <b>{m.seccion.nivel === "PRIMARIA" ? "Educación Primaria" : "Educación Secundaria"}</b>, turno mañana, durante el año académico <b>{m.seccion.anioAcademico}</b>.
        </p>
        <p className="mt-4 text-justify leading-relaxed">Se expide la presente a solicitud del apoderado(a) <b>{e.nombreApoderado}</b>, para los fines que estime conveniente.</p>
        <p className="mt-6 text-right">Huancayo, {formatFechaLarga()}.</p>
        <Firmas />
        <p className="mt-8 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">Documento emitido electrónicamente por el Sistema de Gestión Académica — {COLEGIO}, {SEDE}.</p>
      </div>
      <div className="no-print mt-5 flex justify-end"><PrintButton /></div>
    </div>
  );
}

// ───────────── Comprobante electrónico de pago ─────────────
export function ComprobantePago({ pago }: { pago: Pago }) {
  return (
    <div>
      <div className="print-area bg-white text-sm text-slate-800">
        <MembreteInstitucional titulo="Comprobante Electrónico de Pago" codigo={pago.codigoRecibo} />
        <table className="w-full border-collapse"><tbody>
          <Fila k="Código de operación" v={<span className="font-mono font-bold">{pago.codigoOperacion ?? "—"}</span>} />
          <Fila k="Recibo" v={<span className="font-mono">{pago.codigoRecibo}</span>} />
          <Fila k="Estudiante" v={`${pago.estudiante.apellidos}, ${pago.estudiante.nombres} (${pago.estudiante.codigoEstudiante})`} />
          <Fila k="Apoderado" v={pago.estudiante.nombreApoderado} />
          <Fila k="Concepto" v={pago.concepto} />
          <Fila k="Fecha de vencimiento" v={formatFecha(pago.fechaVencimiento)} />
          <Fila k="Fecha y hora de pago" v={formatFechaHora(pago.fechaPago)} />
          <Fila k="Medio de pago" v={METODO_LABEL[pago.metodoPago ?? ""] ?? pago.metodoPago ?? "—"} />
          <Fila k="Estado" v={<Badge valor={pago.estado} />} />
          <Fila k="Monto pagado" v={<span className="text-lg font-extrabold text-blue-950">{formatSoles(pago.monto)}</span>} />
        </tbody></table>
        <p className="mt-6 text-center text-xs text-slate-500">Este comprobante es una constancia interna emitida por el sistema. Pasarela de pago simulada — sin validez tributaria (SUNAT).</p>
      </div>
      <div className="no-print mt-5 flex justify-end"><PrintButton /></div>
    </div>
  );
}
