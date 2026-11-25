"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { api, useApi } from "@/lib/client";
import type { UsuarioLista } from "@/lib/tipos";
import { Badge, Campo, Empty, ErrorBox, Modal, PageHeader, Spinner, useToast } from "@/components/ui";
import { ROLES, ROL_LABEL, type Rol } from "@/lib/permissions";
import { formatFecha } from "@/lib/utils";

const VACIO = { nombre: "", apellidos: "", email: "", rol: "ADMINISTRATIVO", password: "", activo: true };

export default function UsuariosPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<UsuarioLista[]>("/api/usuarios");
  const [edit, setEdit] = useState<(typeof VACIO & { id?: string }) | null>(null);

  async function guardar() {
    if (!edit) return;
    try {
      const { id, ...cuerpo } = edit;
      if (id) await api(`/api/usuarios/${id}`, { method: "PUT", json: cuerpo }); else await api("/api/usuarios", { method: "POST", json: cuerpo });
      toast.ok(id ? "Usuario actualizado." : "Usuario creado."); setEdit(null); reload();
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <>
      <PageHeader titulo="Usuarios y Roles" subtitulo="Cuentas de acceso y control de permisos (RBAC)" acciones={<button className="btn btn-primary" onClick={() => setEdit({ ...VACIO })}><Plus size={16} /> Nuevo usuario</button>} />
      {loading ? <Spinner /> : error ? <ErrorBox mensaje={error} onRetry={reload} /> : (
        <div className="card overflow-x-auto"><table className="tabla">
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Alta</th><th>Estado</th><th /></tr></thead>
          <tbody>{data?.length === 0 && <tr><td colSpan={6}><Empty texto="Sin usuarios." /></td></tr>}
            {data?.map((u) => (
              <tr key={u.id}><td className="font-medium">{u.nombre} {u.apellidos}</td><td>{u.email}</td><td>{ROL_LABEL[u.rol as Rol]}</td><td>{formatFecha(u.createdAt)}</td><td><Badge valor={u.activo ? "ACTIVO" : "INACTIVO"} /></td>
                <td className="text-right"><button className="btn btn-ghost btn-sm" onClick={() => setEdit({ id: u.id, nombre: u.nombre, apellidos: u.apellidos, email: u.email, rol: u.rol, password: "", activo: u.activo })}><Pencil size={15} /></button></td></tr>
            ))}</tbody></table></div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar usuario" : "Nuevo usuario"}
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}>Guardar</button></>}>
        {edit && <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre"><input className="input" value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} /></Campo>
          <Campo label="Apellidos"><input className="input" value={edit.apellidos} onChange={(e) => setEdit({ ...edit, apellidos: e.target.value })} /></Campo>
          <Campo label="Correo electrónico" className="sm:col-span-2"><input type="email" className="input" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Campo>
          <Campo label="Rol"><select className="input" value={edit.rol} onChange={(e) => setEdit({ ...edit, rol: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}</select></Campo>
          <Campo label={edit.id ? "Nueva contraseña (opcional)" : "Contraseña (mín. 6)"}><input type="password" className="input" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} autoComplete="new-password" /></Campo>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={edit.activo} onChange={(e) => setEdit({ ...edit, activo: e.target.checked })} /> Cuenta activa</label>
        </div>}
      </Modal>
    </>
  );
}
