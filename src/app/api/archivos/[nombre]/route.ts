import path from "path";
import { readFile } from "fs/promises";
import { route, notFound } from "@/lib/api";
import { ROLES } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/** Sirve los archivos de public/uploads solo a usuarios autenticados (funciona también con `next start`). */
export const GET = route<{ nombre: string }>(ROLES, async (_req, { params }) => {
  const nombre = path.basename(decodeURIComponent(params.nombre));
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "uploads", nombre));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME[path.extname(nombre).toLowerCase()] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${nombre}"`,
      },
    });
  } catch {
    throw notFound("El archivo solicitado no existe.");
  }
});
