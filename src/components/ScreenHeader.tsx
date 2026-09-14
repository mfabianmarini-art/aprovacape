export function ScreenHeader({
  crumb,
  title,
  nome,
  papel,
  iniciais,
}: {
  crumb: string;
  title: string;
  nome: string;
  papel: string;
  iniciais: string;
}) {
  return (
    <header
      className="screen-header"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        background: "#fff",
        borderBottom: "1px solid #DDD8CE",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#7A7472" }}>
          {crumb}
        </div>
        <h1
          className="screen-title"
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: ".01em",
          }}
        >
          {title}
        </h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "right", lineHeight: 1.3 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{nome}</div>
          <div style={{ fontSize: 11.5, color: "#7A7472" }}>{papel}</div>
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "#E01B22",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {iniciais}
        </div>
      </div>
    </header>
  );
}
