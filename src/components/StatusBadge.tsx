export function StatusBadge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 9px",
        borderRadius: 3,
        fontSize: 11.5,
        fontWeight: 600,
        background: bg,
        color: fg,
      }}
    >
      {label}
    </span>
  );
}
