"use client";

import { usePathname, useRouter } from "next/navigation";

export function EmpreendimentoSwitcher({
  atualId,
  opcoes,
}: {
  atualId: string;
  opcoes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (opcoes.length <= 1) return null;

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" }}>
        Empreendimento
      </span>
      <select
        value={atualId}
        onChange={(e) => router.push(`${pathname}?emp=${e.target.value}`)}
        style={{
          border: "1px solid #DDD8CE",
          borderRadius: 4,
          padding: "9px 11px",
          fontSize: 13,
          background: "#fff",
          minWidth: 220,
          cursor: "pointer",
        }}
      >
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
