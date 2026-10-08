import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { homeForRole } from "@/lib/nav";

// /acompanhar é a tela do proprietário, sem conta: o acesso é conferido pela própria
// página (protocolo + senha → cookie assinado), não pela sessão.
const PUBLIC_PATHS = ["/login", "/api/auth", "/acompanhar", "/esqueci-senha", "/redefinir-senha", "/api/health"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const session = req.auth;

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL(homeForRole(session.user.role), req.nextUrl.origin));
  }

  if (session && pathname === "/") {
    return NextResponse.redirect(new URL(homeForRole(session.user.role), req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // cape-logo.png precisa ficar público: a própria tela de login (não autenticada) o
  // exibe, então redirecioná-lo para /login quebraria a imagem antes mesmo de logar.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|cape-logo.png|plantas/).*)"],
};
