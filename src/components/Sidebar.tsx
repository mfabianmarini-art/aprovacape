"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { signOutAction } from "@/lib/actions/auth-actions";

export type NavEntry = {
  path: string;
  label: string;
  count: string;
  separadorAntes?: boolean;
  alerta?: boolean;
  destaque?: boolean;
};

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
          color: "#231F20",
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
          background: "#231F20",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          padding: "22px 0 16px",
        }}
      >
        <div style={{ padding: "0 20px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Image src="/cape-logo.png" alt="CAPE" width={42} height={42} priority style={{ flex: "none", display: "block" }} />
            <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#A89F9F", lineHeight: 1.35 }}>
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
            // "" (sem contador) e "0" (contador zerado) não acendem o alerta — só uma
            // solicitação de fato parada esperando decisão da CAPE.
            const pendente = n.alerta && !!n.count && n.count !== "0";
            // Botão de ação principal (Nova solicitação): sempre vermelho, com um anel
            // branco por dentro quando é a tela atual, já que o fundo não pode mudar.
            const destaque = !!n.destaque;
            return (
              <div key={n.path}>
                {n.separadorAntes && (
                  <div style={{ margin: "10px 12px 12px", borderTop: "1px solid rgba(255,255,255,.14)" }} />
                )}
                <button
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
                    fontWeight: active || pendente || destaque ? 600 : 400,
                    background: destaque ? "#E01B22" : active ? "rgba(255,255,255,.14)" : "transparent",
                    color: destaque || active || pendente ? "#FFFFFF" : "#CFC8C6",
                    boxShadow: destaque && active ? "inset 0 0 0 2px rgba(255,255,255,.6)" : undefined,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      flex: "none",
                      background: destaque ? "#FFFFFF" : active ? "#E01B22" : pendente ? "#E0A030" : "rgba(255,255,255,.28)",
                    }}
                  />
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {n.count !== "" && (
                    <span
                      className={pendente ? "nav-badge-alert" : undefined}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: pendente ? 700 : 400,
                        lineHeight: 1,
                        color: pendente ? "#231F20" : "#A89F9F",
                        background: pendente ? "#E0A030" : "transparent",
                        borderRadius: pendente ? 999 : 0,
                        padding: pendente ? "3px 7px" : 0,
                        minWidth: pendente ? 18 : undefined,
                        textAlign: "center",
                      }}
                    >
                      {n.count}
                    </span>
                  )}
                </button>
              </div>
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
                color: "#CFC8C6",
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
