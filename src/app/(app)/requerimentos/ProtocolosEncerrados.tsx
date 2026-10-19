"use client";

import { useState } from "react";

// Protocolos que já saíram da aprovação ficam fora da lista principal e só aparecem a
// pedido — a tela abre com o que está em andamento.
export function ProtocolosEncerrados({ quantidade, children }: { quantidade: number; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  if (quantidade === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        style={{
          alignSelf: "flex-start",
          border: "1px solid #DDD8CE",
          background: "#fff",
          color: "#4A5563",
          borderRadius: 4,
          padding: "9px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {aberto ? "Ocultar protocolos encerrados" : `Ver protocolos encerrados (${quantidade})`}
      </button>
      {aberto && (
        <>
          <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>
            Encerrados — obra liberada, concluída ou reprovada
          </div>
          {children}
        </>
      )}
    </div>
  );
}
