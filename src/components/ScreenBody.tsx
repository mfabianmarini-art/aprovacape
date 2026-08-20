export function ScreenBody({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "26px 32px 48px", display: "flex", flexDirection: "column", gap: 24 }}>{children}</div>
  );
}
