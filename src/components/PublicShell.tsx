import Image from "next/image";

// Moldura das telas abertas, sem barra lateral: login/cadastro e o acompanhamento do
// proprietário por protocolo e senha.
export function PublicShell({ children, largura = 560 }: { children: React.ReactNode; largura?: number }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F2ED",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
        <Image src="/cape-logo.png" alt="CAPE" width={76} height={76} priority style={{ display: "block" }} />
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#7A7472" }}>
          Aprova · Obras em lotes
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: largura, display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
    </div>
  );
}
