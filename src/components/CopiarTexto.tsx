"use client";

import { useState } from "react";

export function CopiarTexto({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
      }}
      style={{ border: "1px solid #DDD8CE", background: "#fff", color: copiado ? "#24603A" : "#E01B22", borderRadius: 4, padding: "5px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
    >
      {copiado ? "Copiado" : rotulo}
    </button>
  );
}
