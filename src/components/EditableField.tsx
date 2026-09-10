"use client";

import { useState, useTransition } from "react";

export function EditableField({
  defaultValue,
  onSave,
  style,
}: {
  defaultValue: string;
  onSave: (value: string) => Promise<void>;
  style: React.CSSProperties;
}) {
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

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
