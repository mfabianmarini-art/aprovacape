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
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        background: "#fff",
        borderBottom: "1px solid #DDD8CE",
        flexWrap: "nowrap",
      }}
    >
      {/* minWidth: 0 deixa esta coluna encolher e o título quebrar linha dentro dela —
          sem isso, em telas estreitas era a LINHA INTEIRA que quebrava, jogando o bloco
          do usuário (abaixo) para debaixo do título em vez de ficar sempre no canto
          superior direito. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0, flex: "1 1 auto" }}>
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
      <div className="screen-user" style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
        <div style={{ textAlign: "right", lineHeight: 1.3 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{nome}</div>
          <div className="screen-user-papel" style={{ fontSize: 11.5, color: "#7A7472" }}>
            {papel}
          </div>
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
            flex: "none",
          }}
        >
          {iniciais}
        </div>
      </div>
    </header>
  );
}
