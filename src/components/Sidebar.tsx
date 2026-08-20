"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth-actions";

export type NavEntry = { path: string; label: string; count: string };

export function Sidebar({ nav }: { nav: NavEntry[] }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      style={{
        width: 250,
        flex: "none",
        background: "#0B2E3F",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "22px 0 16px",
      }}
    >
      <div style={{ padding: "0 20px 22px", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 27, letterSpacing: ".14em", lineHeight: 1 }}>
          CAPE
        </div>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#8FB0BF" }}>
          Aprova · Obras em lotes
        </div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 10px" }}>
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
  );
}
