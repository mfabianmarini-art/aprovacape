export function ScreenBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="screen-body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {children}
    </div>
  );
}
