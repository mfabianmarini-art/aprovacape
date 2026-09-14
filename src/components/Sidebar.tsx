"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth-actions";

export type NavEntry = { path: string; label: string; count: string };

export function Sidebar({ nav }: { nav: NavEntry[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pathnameAberto, setPathnameAberto] = useState(pathname);

  // Trocar de tela fecha a gaveta no celular — sem isso ela ficava aberta por
  // cima da tela seguinte, como se a navegação não tivesse funcionado. Ajustado
  // durante a renderização (em vez de um efeito) seguindo o padrão do React para
  // resetar estado quando uma prop muda: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (pathname !== pathnameAberto) {
    setPathnameAberto(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="app-menu-btn"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          margin: 8,
          border: "1px solid #DDD8CE",
          background: "#fff",
          borderRadius: 6,
          fontSize: 18,
          color: "#0B2E3F",
          cursor: "pointer",
        }}
      >
        ☰
      </button>
      <div className="app-sidebar-backdrop" data-open={open} onClick={() => setOpen(false)} />
      <aside
        className="app-sidebar"
        data-open={open}
        style={{
          background: "#0B2E3F",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          padding: "22px 0 16px",
        }}
      >
        <div style={{ padding: "0 20px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 27, letterSpacing: ".14em", lineHeight: 1 }}>
              CAPE
            </div>
            <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#8FB0BF" }}>
              Aprova · Obras em lotes
            </div>
          </div>
          <button
            type="button"
            className="app-menu-close"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              border: "1px solid rgba(255,255,255,.3)",
              background: "transparent",
              color: "#fff",
              borderRadius: 4,
              fontSize: 14,
              cursor: "pointer",
              flex: "none",
            }}
          >
            ×
          </button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 10px", overflowY: "auto" }}>
          {nav.map((n) => {
            const active = pathname === n.path || pathname.startsWith(n.path + "/");
            return (
              <button
                key={n.path}
                onClick={() => router.push(n.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  cursor: "pointer",
                  padding: "10px 12px",
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 400,
                  background: active ? "rgba(255,255,255,.14)" : "transparent",
                  color: active ? "#FFFFFF" : "#C7D8E0",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    flex: "none",
                    background: active ? "#B4711A" : "rgba(255,255,255,.28)",
                  }}
                />
                <span style={{ flex: 1 }}>{n.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8FB0BF" }}>{n.count}</span>
              </button>
            );
          })}
        </nav>
        <div
          style={{
            marginTop: "auto",
            padding: "16px 20px 0",
            borderTop: "1px solid rgba(255,255,255,.12)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <form action={signOutAction}>
            <button
              type="submit"
              style={{
                width: "100%",
                border: "1px solid rgba(255,255,255,.22)",
                background: "transparent",
                color: "#C7D8E0",
                borderRadius: 5,
                padding: "9px 10px",
                fontSize: 12.5,
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              Sair da conta
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
