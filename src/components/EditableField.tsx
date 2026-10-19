"use client";

import { useState, useTransition } from "react";

export function EditableField({
  defaultValue,
  onSave,
  style,
  multilinha = false,
}: {
  defaultValue: string;
  onSave: (value: string) => Promise<void>;
  style: React.CSSProperties;
  // Textarea que cresce com o conteúdo (itens do check-list com critérios em várias linhas).
  multilinha?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  if (multilinha) {
    return (
      <textarea
        value={value}
        rows={Math.max(1, value.split("\n").length)}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== defaultValue) startTransition(() => onSave(value));
        }}
        style={{ resize: "vertical", ...style }}
      />
    );
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== defaultValue) startTransition(() => onSave(value));
      }}
      style={style}
    />
  );
}
