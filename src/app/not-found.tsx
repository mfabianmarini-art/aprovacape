import Link from "next/link";

export const metadata = { title: "Página não encontrada · CAPE Aprova" };

export default function NaoEncontrado() {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F2ED", display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 16px" }}>
      <div style={{ maxWidth: 480, width: "100%", background: "#fff", border: "1px solid #DDD8CE", borderTop: "3px solid #E01B22", borderRadius: 4, padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>Página não encontrada</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3B4653" }}>
          O endereço não existe ou o conteúdo não está mais disponível. Confira o link ou volte ao início.
        </div>
        <Link href="/" style={{ fontSize: 13, fontWeight: 600, color: "#E01B22" }}>
          Voltar ao início →
        </Link>
      </div>
    </div>
  );
}
