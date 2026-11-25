import { NextResponse, type NextRequest } from "next/server";
import { verificarToken, SESSION_COOKIE } from "@/lib/auth-edge";
import { puedeVerRuta } from "@/lib/permissions";

const PUBLICAS = ["/login", "/api/auth/login", "/api/auth/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const esApi = pathname.startsWith("/api/");
  const sesion = await verificarToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (PUBLICAS.includes(pathname)) {
    if (pathname === "/login" && sesion) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (!sesion) {
    if (esApi) return NextResponse.json({ error: "No autenticado. Inicie sesión para continuar." }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!esApi && pathname !== "/" && !puedeVerRuta(sesion.rol, pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
