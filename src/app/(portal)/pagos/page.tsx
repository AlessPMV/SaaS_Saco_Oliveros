"use client";

import { useState } from "react";
import { CreditCard, Plus, Receipt, Search } from "lucide-react";
import { api, useApi } from "@/lib/client";
import type { Estudiante, Pago } from "@/lib/tipos";
import { Badge, Campo, Empty, ErrorBox, Modal, PageHeader, Spinner, StatCard, useToast } from "@/components/ui";
import { PasarelaPago } from "@/components/PasarelaPago";
import { ComprobantePago } from "@/components/Documentos";
import { formatFecha, formatFechaHora, formatSoles, fechaISO, METODO_LABEL } from "@/lib/utils";
import { useSesion } from "@/components/useSesion";

export default function PagosPage() {
  const user = useSesion();
  const toast = useToast();
  const [estudianteId, setEstudianteId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [estado, setEstado] = useState("");
  const p = new URLSearchParams();
  if (estudianteId) p.set("estudianteId", estudianteId);
  if (concepto) p.set("concepto", concepto);
  if (estado) p.set("estado", estado);
  const { data, loading, error, reload } = useApi<Pago[]>(user ? `/api/pagos?${p}` : null);
  const estudiantes = useApi<Estudiante[]>(user ? "/api/estudiantes" : null);
  const [aPagar, setAPagar] = useState<Pago | null>(null);
  const [comprobante, setComprobante] = useState<Pago | null>(null);
  const [cargo, setCargo] = useState<{ estudianteId: string; concepto: string; monto: string; fechaVencimiento: string } | null>(null);
  const gestiona = user?.rol === "ADMINISTRADOR" || user?.rol === "ADMINISTRATIVO";

  const suma = (f: (x: Pago) => boolean) => (data ?? []).filter(f).reduce((s, x) => s + x.monto, 0);

  async function crearCargo() {
    if (!cargo) return;
    try { await api("/api/pagos", { method: "POST", json: cargo }); toast.ok("Cargo generado correctamente."); setCargo(null); reload(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <>
      <PageHeader titulo={gestiona ? "Pagos, Pensiones y Cobranza" : "Estado de cuenta"} subtitulo={gestiona ? "Cobro en caja y seguimiento de recibos" : "Consulte sus recibos y pague en línea"}
        acciones={gestiona ? <button className="btn btn-primary" onClick={() => setCargo({ estudianteId: estudiantes.data?.[0]?.id ?? "", concepto: "", monto: "", fechaVencimiento: fechaISO() })}><Plus size={16} /> Nuevo cargo</button> : undefined} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard titulo="Pagado" valor={formatSoles(suma((x) => x.estado === "PAGADO"))} icon={<Receipt size={22} />} color="green" />
        <StatCard titulo="Pendiente" valor={formatSoles(suma((x) => x.estado === "PENDIENTE"))} icon={<Receipt size={22} />} color="amber" />
        <StatCard titulo="Vencido" valor={formatSoles(suma((x) => x.estado === "VENCIDO"))} icon={<Receipt size={22} />} color="red" />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input w-auto min-w-[220px]" value={estudianteId} onChange={(e) => setEstudianteId(e.target.value)}><option value="">Todos los estudiantes</option>{estudiantes.data?.map((e) => <option key={e.id} value={e.id}>{e.apellidos}, {e.nombres}</option>)}</select>
        <div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input className="input pl-9" placeholder="Filtrar por concepto o recibo…" value={concepto} onChange={(e) => setConcepto(e.target.value)} /></div>
        <select className="input w-auto" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos los estados</option><option value="PENDIENTE">Pendiente</option><option value="PAGADO">Pagado</option><option value="VENCIDO">Vencido</option></select>
      </div>

      {loading ? <Spinner /> : error ? <ErrorBox mensaje={error} onRetry={reload} /> : (
        <div className="card overflow-x-auto"><table className="tabla">
          <thead><tr><th>Recibo</th><th>Estudiante</th><th>Concepto</th><th>Vence</th><th>Estado</th><th>Pago</th><th className="text-right">Monto</th><th /></tr></thead>
          <tbody>
            {data?.length === 0 && <tr><td colSpan={8}><Empty texto="No se encontraron recibos." /></td></tr>}
            {data?.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs">{r.codigoRecibo}</td><td className="font-medium">{r.estudiante.apellidos}, {r.estudiante.nombres}</td><td>{r.concepto}</td><td>{formatFecha(r.fechaVencimiento)}</td><td><Badge valor={r.estado} /></td>
                <td className="text-xs text-slate-500">{r.fechaPago ? <>{formatFechaHora(r.fechaPago)}<br />{METODO_LABEL[r.metodoPago ?? ""] ?? r.metodoPago} · {r.codigoOperacion}</> : "—"}</td>
                <td className="text-right font-semibold">{formatSoles(r.monto)}</td>
                <td className="text-right">{r.estado === "PAGADO"
                  ? <button className="btn btn-outline btn-sm" onClick={() => setComprobante(r)}><Receipt size={14} /> Comprobante</button>
                  : <button className="btn btn-accent btn-sm" onClick={() => setAPagar(r)}><CreditCard size={14} /> {gestiona ? "Cobrar" : "Pagar en línea"}</button>}</td>
              </tr>
            ))}
          </tbody></table></div>
      )}

      <PasarelaPago pago={aPagar} onClose={() => setAPagar(null)} onPagado={reload} />
      <Modal open={!!comprobante} onClose={() => setComprobante(null)} title="Comprobante de pago" size="lg">{comprobante && <ComprobantePago pago={comprobante} />}</Modal>
      <Modal open={!!cargo} onClose={() => setCargo(null)} title="Nuevo cargo de pago"
        footer={<><button className="btn btn-outline" onClick={() => setCargo(null)}>Cancelar</button><button className="btn btn-primary" onClick={crearCargo}>Generar cargo</button></>}>
        {cargo && <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Estudiante" className="sm:col-span-2"><select className="input" value={cargo.estudianteId} onChange={(e) => setCargo({ ...cargo, estudianteId: e.target.value })}>{estudiantes.data?.map((e) => <option key={e.id} value={e.id}>{e.apellidos}, {e.nombres}</option>)}</select></Campo>
          <Campo label="Concepto" className="sm:col-span-2"><input className="input" value={cargo.concepto} onChange={(e) => setCargo({ ...cargo, concepto: e.target.value })} placeholder="Ej.: Pensión Diciembre 2026" /></Campo>
          <Campo label="Monto (S/)"><input type="number" min={1} step="0.01" className="input" value={cargo.monto} onChange={(e) => setCargo({ ...cargo, monto: e.target.value })} /></Campo>
          <Campo label="Vencimiento"><input type="date" className="input" value={cargo.fechaVencimiento} onChange={(e) => setCargo({ ...cargo, fechaVencimiento: e.target.value })} /></Campo>
        </div>}
      </Modal>
    </>
  );
}
