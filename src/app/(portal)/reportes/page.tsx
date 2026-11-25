"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { descargarCSV, useApi } from "@/lib/client";
import { Barra, Empty, ErrorBox, PageHeader, PrintButton, Spinner, Tabs } from "@/components/ui";
import { METODO_LABEL, formatSoles } from "@/lib/utils";

type Tab = "matriculas" | "recaudacion" | "inasistencias" | "morosidad";

function Tabla({ cols, filas, csv }: { cols: string[]; filas: (string | number)[][]; csv: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="no-print flex justify-end gap-2 border-b border-slate-200 p-3">
        <button className="btn btn-outline btn-sm" onClick={() => descargarCSV(csv, [cols, ...filas])}><Download size={14} /> Exportar CSV</button>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Imprimir</button>
      </div>
      <div className="overflow-x-auto"><table className="tabla"><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{filas.length === 0 && <tr><td colSpan={cols.length}><Empty texto="Sin datos para este reporte." /></td></tr>}
          {filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
    </div>
  );
}

export default function ReportesPage() {
  const [tab, setTab] = useState<Tab>("matriculas");
  return (
    <>
      <PageHeader titulo="Reportes Administrativos" subtitulo="Matrícula, recaudación, inasistencias y morosidad" />
      <Tabs<Tab> activa={tab} onChange={setTab} tabs={[{ id: "matriculas", label: "Matrícula y vacantes" }, { id: "recaudacion", label: "Recaudación" }, { id: "inasistencias", label: "Inasistencias" }, { id: "morosidad", label: "Morosidad" }]} />
      {tab === "matriculas" && <Matriculas />}
      {tab === "recaudacion" && <Recaudacion />}
      {tab === "inasistencias" && <Inasistencias />}
      {tab === "morosidad" && <Morosidad />}
    </>
  );
}

function Matriculas() {
  const { data, loading, error, reload } = useApi<{ seccion: string; nivel: string; capacidad: number; matriculados: number; vacantes: number; ocupacion: number }[]>("/api/reportes?tipo=matriculas");
  if (loading) return <Spinner />; if (error || !data) return <ErrorBox mensaje={error ?? "Error"} onRetry={reload} />;
  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-5">{data.map((s) => <div key={s.seccion}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{s.seccion}</span><span className="text-slate-500">{s.matriculados}/{s.capacidad} ({s.ocupacion}%)</span></div><Barra valor={s.matriculados} max={s.capacidad} color={s.ocupacion >= 100 ? "bg-red-700" : "bg-blue-950"} /></div>)}</div>
      <Tabla csv="reporte-matriculas.csv" cols={["Sección", "Nivel", "Capacidad", "Matriculados", "Vacantes", "Ocupación %"]} filas={data.map((s) => [s.seccion, s.nivel, s.capacidad, s.matriculados, s.vacantes, `${s.ocupacion}%`])} />
    </div>
  );
}

function Recaudacion() {
  type G = { nombre: string; cantidad: number; monto: number }[];
  const { data, loading, error, reload } = useApi<{ porEstado: G; porConcepto: G; porMetodo: G }>("/api/reportes?tipo=recaudacion");
  if (loading) return <Spinner />; if (error || !data) return <ErrorBox mensaje={error ?? "Error"} onRetry={reload} />;
  const filas = [...data.porEstado.map((x) => ["Por estado", x.nombre, x.cantidad, formatSoles(x.monto)]), ...data.porConcepto.map((x) => ["Por concepto", x.nombre, x.cantidad, formatSoles(x.monto)]), ...data.porMetodo.map((x) => ["Por medio de pago (cobrado)", METODO_LABEL[x.nombre] ?? x.nombre, x.cantidad, formatSoles(x.monto)])];
  return <Tabla csv="reporte-recaudacion.csv" cols={["Agrupación", "Detalle", "Recibos", "Monto"]} filas={filas} />;
}

function Inasistencias() {
  const { data, loading, error, reload } = useApi<{ codigo: string; estudiante: string; seccion: string; tardanzas: number; justificadas: number; injustificadas: number; registros: number }[]>("/api/reportes?tipo=inasistencias");
  if (loading) return <Spinner />; if (error || !data) return <ErrorBox mensaje={error ?? "Error"} onRetry={reload} />;
  return <Tabla csv="reporte-inasistencias.csv" cols={["Código", "Estudiante", "Sección", "Registros", "Tardanzas", "F. justificadas", "F. injustificadas"]} filas={data.map((x) => [x.codigo, x.estudiante, x.seccion, x.registros, x.tardanzas, x.justificadas, x.injustificadas])} />;
}

function Morosidad() {
  const { data, loading, error, reload } = useApi<{ codigo: string; estudiante: string; apoderado: string; telefono: string; recibos: number; vencidos: number; monto: number }[]>("/api/reportes?tipo=morosidad");
  if (loading) return <Spinner />; if (error || !data) return <ErrorBox mensaje={error ?? "Error"} onRetry={reload} />;
  return <><Tabla csv="reporte-morosidad.csv" cols={["Código", "Estudiante", "Apoderado", "Teléfono", "Recibos pend.", "Vencidos", "Deuda"]} filas={data.map((x) => [x.codigo, x.estudiante, x.apoderado, x.telefono, x.recibos, x.vencidos, formatSoles(x.monto)])} /><div className="no-print mt-3 hidden"><PrintButton /></div></>;
}
