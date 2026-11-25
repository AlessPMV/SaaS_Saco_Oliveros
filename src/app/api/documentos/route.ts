import { NextRequest } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { route, leerJson, created, badRequest, forbidden, notFound, conflict } from "@/lib/api";
import { ROLES } from "@/lib/permissions";
import { enumerado, texto, textoOpc } from "@/lib/validators";
import { TIPOS_DOCUMENTO, nombreSeccion } from "@/lib/utils";
import { estudiantesDelApoderado, seccionesDelApoderado, seccionesDelDocente } from "@/lib/servicios";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONES = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg", ".txt"];
const DIR_UPLOADS = path.join(process.cwd(), "public", "uploads");

export const GET = route(ROLES, async (req, { user }) => {
  const sp = req.nextUrl.searchParams;
  const filtros: Prisma.DocumentoWhereInput[] = [];
  if (sp.get("tipo")) filtros.push({ tipo: sp.get("tipo")! });
  if (sp.get("seccionId")) filtros.push({ seccionId: sp.get("seccionId")! });
  if (sp.get("estudianteId")) filtros.push({ estudianteId: sp.get("estudianteId")! });
  const q = sp.get("q")?.trim();
  if (q) filtros.push({ OR: [{ titulo: { contains: q } }, { descripcion: { contains: q } }] });

  if (user.rol === "APODERADO_ESTUDIANTE") {
    const [estIds, secIds] = await Promise.all([estudiantesDelApoderado(user.id), seccionesDelApoderado(user.id)]);
    filtros.push({ OR: [{ estudianteId: { in: estIds } }, { tipo: "COMUNICADO", estudianteId: null }, { tipo: "SILABO", seccionId: { in: secIds } }] });
  } else if (user.rol === "DOCENTE") {
    const secIds = await seccionesDelDocente(user.id);
    filtros.push({ OR: [{ subidoPorId: user.id }, { tipo: "COMUNICADO", estudianteId: null }, { tipo: "SILABO", seccionId: { in: secIds } }] });
  }

  const docs = await prisma.documento.findMany({
    where: { AND: filtros },
    include: { estudiante: { select: { nombres: true, apellidos: true, codigoEstudiante: true } }, seccion: true },
    orderBy: { createdAt: "desc" },
  });
  const autores = await prisma.usuario.findMany({ where: { id: { in: Array.from(new Set(docs.map((d) => d.subidoPorId))) } }, select: { id: true, nombre: true, apellidos: true } });
  const mapa = new Map(autores.map((a) => [a.id, `${a.nombre} ${a.apellidos}`]));
  return docs.map((d) => ({ ...d, subidoPor: mapa.get(d.subidoPorId) ?? "—", seccionNombre: d.seccion ? nombreSeccion(d.seccion) : null }));
});

const GENERADOS = {
  CONSTANCIA_MATRICULA: { tipo: "CONSTANCIA_MATRICULA", sentinela: "gen:MATRICULA", titulo: "Constancia de Matrícula" },
  CONSTANCIA_ESTUDIOS: { tipo: "CERTIFICADO", sentinela: "gen:ESTUDIOS", titulo: "Constancia de Estudios" },
  ESTADO_CUENTA: { tipo: "BOLETA_PAGO", sentinela: "gen:ESTADO_CUENTA", titulo: "Estado de Cuenta" },
} as const;

export const POST = route(ROLES, async (req: NextRequest, { user }) => {
  const contentType = req.headers.get("content-type") ?? "";

  // ── Emisión de documentos institucionales generados automáticamente
  if (contentType.includes("application/json")) {
    if (user.rol === "DOCENTE") throw forbidden("Los docentes solo pueden subir sílabos y documentos académicos.");
    const body = await leerJson(req);
    const clave = enumerado(body.generar, "Documento a generar", ["CONSTANCIA_MATRICULA", "CONSTANCIA_ESTUDIOS", "ESTADO_CUENTA"] as const);
    const estudianteId = texto(body.estudianteId, "Estudiante");
    const est = await prisma.estudiante.findUnique({ where: { id: estudianteId }, include: { matriculas: { where: { estado: "ACTIVA" }, include: { seccion: true } } } });
    if (!est) throw notFound("Estudiante no encontrado.");
    if (user.rol === "APODERADO_ESTUDIANTE" && est.usuarioApoderadoId !== user.id) throw forbidden("Este estudiante no está vinculado a su cuenta.");
    const g = GENERADOS[clave];
    if (clave !== "ESTADO_CUENTA" && est.matriculas.length === 0) throw conflict("El estudiante no tiene una matrícula activa para emitir este documento.");
    const doc = await prisma.documento.create({
      data: {
        titulo: `${g.titulo} — ${est.apellidos}, ${est.nombres}`,
        tipo: g.tipo,
        descripcion: `${g.titulo} emitida automáticamente por el sistema el ${new Date().toLocaleDateString("es-PE")}.`,
        rutaArchivo: g.sentinela,
        estudianteId: est.id,
        seccionId: est.matriculas[0]?.seccionId ?? null,
        subidoPorId: user.id,
      },
    });
    return created(doc);
  }

  // ── Subida real de archivos (FormData)
  if (user.rol === "APODERADO_ESTUDIANTE") throw forbidden("No tiene permisos para subir documentos.");
  const form = await req.formData().catch(() => { throw badRequest("No se pudo leer el formulario de subida."); });
  const titulo = texto(form.get("titulo"), "Título", { max: 150 });
  const tipo = enumerado(form.get("tipo"), "Tipo de documento", TIPOS_DOCUMENTO);
  const descripcion = textoOpc(form.get("descripcion"), "Descripción", { max: 400 }) ?? "";
  const seccionId = textoOpc(form.get("seccionId"), "Sección");
  const estudianteId = textoOpc(form.get("estudianteId"), "Estudiante");
  if (user.rol === "DOCENTE") {
    if (tipo !== "SILABO") throw forbidden("Los docentes solo pueden subir sílabos.");
    if (!seccionId) throw badRequest("Seleccione la sección a la que pertenece el sílabo.");
    if (!(await seccionesDelDocente(user.id)).includes(seccionId)) throw forbidden("No tiene asignada la sección seleccionada.");
  }
  if (seccionId && !(await prisma.seccion.findUnique({ where: { id: seccionId } }))) throw notFound("La sección seleccionada no existe.");
  if (estudianteId && !(await prisma.estudiante.findUnique({ where: { id: estudianteId } }))) throw notFound("El estudiante seleccionado no existe.");

  let rutaArchivo: string | null = null;
  const archivo = form.get("archivo");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > MAX_BYTES) throw badRequest("El archivo excede el tamaño máximo permitido de 10 MB.");
    const ext = path.extname(archivo.name).toLowerCase();
    if (!EXTENSIONES.includes(ext)) throw badRequest(`Tipo de archivo no permitido. Formatos válidos: ${EXTENSIONES.join(", ")}.`);
    const base = path.basename(archivo.name, ext).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "documento";
    const nombre = `${Date.now()}-${base}${ext}`;
    await mkdir(DIR_UPLOADS, { recursive: true });
    await writeFile(path.join(DIR_UPLOADS, nombre), new Uint8Array(await archivo.arrayBuffer()));
    rutaArchivo = `/api/archivos/${nombre}`;
  } else if (tipo === "SILABO") {
    throw badRequest("Adjunte el archivo del sílabo.");
  }
  const doc = await prisma.documento.create({
    data: { titulo, tipo, descripcion, rutaArchivo, seccionId, estudianteId, subidoPorId: user.id },
  });
  return created(doc);
});

