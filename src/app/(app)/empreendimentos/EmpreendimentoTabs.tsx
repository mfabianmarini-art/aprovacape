"use client";

import { useState } from "react";

type TabId = "config" | "quadras" | "usuarios" | "documentos";

const TABS: { id: TabId; label: string }[] = [
  { id: "config", label: "Configuração" },
  { id: "quadras", label: "Quadras e lotes" },
  { id: "usuarios", label: "Usuários" },
  { id: "documentos", label: "Documentos técnicos" },
];

export function EmpreendimentoTabs({
  contagens,
  config,
  quadras,
  usuarios,
  documentos,
}: {
  contagens: Partial<Record<TabId, number>>;
  config: React.ReactNode;
  quadras: React.ReactNode;
  usuarios: React.ReactNode;
  documentos: React.ReactNode;
}) {
  const [aba, setAba] = useState<TabId>("config");
  const conteudo: Record<TabId, React.ReactNode> = { config, quadras, usuarios, documentos };

  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4 }}>
      <div className="table-scroll">
        <div style={{ display: "flex", borderBottom: "1px solid #EDE9E1", minWidth: 560 }}>
          {TABS.map((t) => {
            const ativa = aba === t.id;
            const contagem = contagens[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAba(t.id)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 3,
                  border: 0,
                  borderBottom: `3px solid ${ativa ? "#E01B22" : "transparent"}`,
                  background: "#fff",
                  padding: "14px 16px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: ativa ? "#231F20" : "#7A7472" }}>
                  {t.label}
                  {contagem != null && <span style={{ fontWeight: 400, color: "#8B939C" }}> · {contagem}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Mantido montado (display:none em vez de desmontar) para não perder o estado de
          edição de cada aba — por exemplo uma quadra deixada expandida — ao trocar de aba. */}
      {TABS.map((t) => (
        <div key={t.id} style={{ display: aba === t.id ? "block" : "none" }}>
          {conteudo[t.id]}
        </div>
      ))}
    </section>
  );
}
