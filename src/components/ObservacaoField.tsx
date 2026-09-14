"use client";

import { useState, useTransition } from "react";

// Salva ao sair do campo, como o EditableField — o analista percorre vários itens
// seguidos e um botão "salvar" por item viraria atrito.
export function ObservacaoField({
  defaultValue,
  placeholder,
  onSave,
}: {
  defaultValue: string;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(defaultValue);
  const [salvo, setSalvo] = useState<string | null>(defaultValue || null);
  const [pending, startTransition] = useTransition();

  const alterado = value.trim() !== (salvo ?? "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (!alterado) return;
          startTransition(async () => {
            await onSave(value);
            setSalvo(value.trim());
          });
        }}
        rows={2}
        maxLength={1000}
        placeholder={placeholder}
        style={{
          border: "1px solid #E8D7B4",
          background: "#FFFDF8",
          borderRadius: 4,
          padding: "8px 10px",
          fontSize: 12.5,
          fontFamily: "inherit",
          lineHeight: 1.45,
          resize: "vertical",
          width: "100%",
        }}
      />
      <span style={{ fontSize: 10.5, color: pending ? "#8A5210" : alterado ? "#8A5210" : "#7A7472", fontFamily: "var(--font-mono)" }}>
        {pending ? "salvando…" : alterado ? "sai do campo para salvar" : salvo ? "salvo" : "visível ao proprietário e ao RT"}
      </span>
    </div>
  );
}
