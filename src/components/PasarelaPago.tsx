"use client";

import { useState } from "react";
import { Banknote, CheckCircle2, CreditCard, Loader2, QrCode, Smartphone } from "lucide-react";
import { api } from "@/lib/client";
import type { Pago } from "@/lib/tipos";
import { formatFecha, formatSoles, type MetodoPago } from "@/lib/utils";
import { Modal, useToast } from "@/components/ui";
import { ComprobantePago } from "@/components/Documentos";

/** QR institucional simulado (patrón determinista a partir de un texto; no es un QR real escaneable). */
function QRSimulado({ semilla }: { semilla: string }) {
  const N = 25;
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  const buscador = (x: number, y: number) => {
    const en = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    const pinta = (ox: number, oy: number) => { const dx = x - ox, dy = y - oy; return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4); };
    if (en(0, 0)) return pinta(0, 0);
    if (en(N - 7, 0)) return pinta(N - 7, 0);
    if (en(0, N - 7)) return pinta(0, N - 7);
    return null;
  };
  const celdas: boolean[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) celdas.push(buscador(x, y) ?? rnd() > 0.52);
  return (
    <svg viewBox={`0 0 ${N} ${N}`} className="h-44 w-44 rounded-lg border-4 border-white bg-white shadow" shapeRendering="crispEdges" role="img" aria-label="Código QR institucional simulado">
      {celdas.map((on, i) => on && <rect key={i} x={i % N} y={Math.floor(i / N)} width={1} height={1} fill="#0F2C59" />)}
    </svg>
  );
}

export function PasarelaPago({ pago, onClose, onPagado }: { pago: Pago | null; onClose: () => void; onPagado: () => void }) {
  const toast = useToast();
  const [metodo, setMetodo] = useState<MetodoPago>("YAPE_PLIN");
  const [procesando, setProcesando] = useState(false);
  const [pagado, setPagado] = useState<Pago | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tarjeta, setTarjeta] = useState({ numero: "", titular: "", vencimiento: "", cvv: "" });
  const [yapeOk, setYapeOk] = useState(false);
  const [refTransf, setRefTransf] = useState("");

  function cerrar() {
    setPagado(null); setError(null); setYapeOk(false); setRefTransf(""); setTarjeta({ numero: "", titular: "", vencimiento: "", cvv: "" }); setMetodo("YAPE_PLIN");
    onClose();
  }

  function validar(): string | null {
    if (metodo === "YAPE_PLIN" && !yapeOk) return "Confirme que realizó el pago con Yape o Plin escaneando el código QR.";
    if (metodo === "TRANSFERENCIA" && refTransf.trim().length < 6) return "Ingrese el número de operación bancaria (mínimo 6 caracteres).";
    if (metodo === "TARJETA") {
      const n = tarjeta.numero.replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(n)) return "Ingrese un número de tarjeta válido (13 a 19 dígitos).";
      if (tarjeta.titular.trim().length < 3) return "Ingrese el nombre del titular de la tarjeta.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(tarjeta.vencimiento)) return "La fecha de vencimiento debe tener el formato MM/AA.";
      if (!/^\d{3,4}$/.test(tarjeta.cvv)) return "El CVV debe tener 3 o 4 dígitos.";
    }
    return null;
  }

  async function confirmar() {
    if (!pago) return;
    const v = validar();
    if (v) { setError(v); return; }
    setError(null);
    setProcesando(true);
    try {
      // Simula la validación bancaria (800 ms) en paralelo con el registro real del pago
      const [res] = await Promise.all([
        api<Pago>(`/api/pagos/${pago.id}/pagar`, { method: "POST", json: { metodoPago: metodo, tarjeta: metodo === "TARJETA" ? tarjeta : undefined } }),
        new Promise((r) => setTimeout(r, 800)),
      ]);
      setPagado(res);
      toast.ok(`Pago confirmado. Operación ${res.codigoOperacion}.`);
      onPagado();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcesando(false);
    }
  }

  const opciones: { id: MetodoPago; label: string; icon: React.ReactNode }[] = [
    { id: "YAPE_PLIN", label: "Yape / Plin", icon: <Smartphone size={18} /> },
    { id: "TARJETA", label: "Tarjeta", icon: <CreditCard size={18} /> },
    { id: "TRANSFERENCIA", label: "Transferencia", icon: <Banknote size={18} /> },
  ];

  return (
    <Modal open={!!pago} onClose={cerrar} size="lg" title={pagado ? "Pago realizado con éxito" : "Pasarela de pago (simulada)"}
      footer={pagado ? <button className="btn btn-outline" onClick={cerrar}>Cerrar</button> : <><button className="btn btn-outline" onClick={cerrar} disabled={procesando}>Cancelar</button><button className="btn btn-accent" onClick={confirmar} disabled={procesando}>{procesando ? <><Loader2 size={16} className="animate-spin" /> Validando con el banco…</> : `Pagar ${pago ? formatSoles(pago.monto) : ""}`}</button></>}>
      {pago && pagado && (
        <div>
          <div className="no-print mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800"><CheckCircle2 size={20} /> El pago de «{pagado.concepto}» fue registrado. Ya puede imprimir su comprobante.</div>
          <ComprobantePago pago={pagado} />
        </div>
      )}
      {pago && !pagado && (
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-bold text-blue-950">{pago.concepto}</p><p className="text-slate-600">{pago.estudiante.apellidos}, {pago.estudiante.nombres} · {pago.codigoRecibo}</p><p className="text-xs text-slate-500">Vence: {formatFecha(pago.fechaVencimiento)}</p></div>
              <p className="text-2xl font-extrabold text-red-700">{formatSoles(pago.monto)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {opciones.map((o) => (
              <button key={o.id} onClick={() => { setMetodo(o.id); setError(null); }} disabled={procesando}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-3 text-sm font-semibold transition ${metodo === o.id ? "border-blue-950 bg-blue-950/5 text-blue-950" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {o.icon}{o.label}
              </button>
            ))}
          </div>

          {metodo === "YAPE_PLIN" && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 p-5 text-center sm:flex-row sm:text-left">
              <QRSimulado semilla={`SO-HYO|${pago.codigoRecibo}|${pago.monto}`} />
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 font-bold text-blue-950"><QrCode size={16} /> Escanee con Yape o Plin</p>
                <p className="text-slate-600">Titular: <b>Colegio Saco Oliveros — Sede Huancayo</b><br />Celular institucional: <b>964 000 123</b><br />Monto: <b>{formatSoles(pago.monto)}</b></p>
                <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={yapeOk} onChange={(e) => setYapeOk(e.target.checked)} /> Ya realicé el pago desde mi aplicación</label>
              </div>
            </div>
          )}

          {metodo === "TARJETA" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="label">Número de tarjeta</label>
                <input className="input font-mono" inputMode="numeric" placeholder="4111 1111 1111 1111" maxLength={23} value={tarjeta.numero}
                  onChange={(e) => setTarjeta((t) => ({ ...t, numero: e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim() }))} /></div>
              <div className="sm:col-span-2"><label className="label">Titular</label><input className="input uppercase" placeholder="COMO FIGURA EN LA TARJETA" value={tarjeta.titular} onChange={(e) => setTarjeta((t) => ({ ...t, titular: e.target.value }))} /></div>
              <div><label className="label">Vencimiento (MM/AA)</label><input className="input" placeholder="12/28" maxLength={5} value={tarjeta.vencimiento}
                onChange={(e) => { let v = e.target.value.replace(/[^\d]/g, "").slice(0, 4); if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`; setTarjeta((t) => ({ ...t, vencimiento: v })); }} /></div>
              <div><label className="label">CVV</label><input className="input" type="password" inputMode="numeric" placeholder="123" maxLength={4} value={tarjeta.cvv} onChange={(e) => setTarjeta((t) => ({ ...t, cvv: e.target.value.replace(/\D/g, "") }))} /></div>
              <p className="text-xs text-slate-500 sm:col-span-2">Entorno de demostración: puede usar la tarjeta de prueba 4111 1111 1111 1111. Los datos de la tarjeta no se almacenan.</p>
            </div>
          )}

          {metodo === "TRANSFERENCIA" && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-4 text-sm">
              <p className="font-bold text-blue-950">Datos para la transferencia</p>
              <p className="text-slate-600">Banco: <b>Banco de Crédito del Perú (simulado)</b><br />Cuenta corriente en soles: <b>191-2045678-0-31</b><br />CCI: <b>002-191-002045678031-52</b><br />Titular: <b>Colegio Saco Oliveros — Sede Huancayo</b></p>
              <div><label className="label">N.° de operación bancaria</label><input className="input" placeholder="Ej.: 00458712" value={refTransf} onChange={(e) => setRefTransf(e.target.value)} /></div>
            </div>
          )}

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
