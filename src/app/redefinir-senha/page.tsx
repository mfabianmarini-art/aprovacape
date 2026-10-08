import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { tokenRedefinicaoValido } from "@/lib/redefinicao-senha";
import { RedefinirSenhaForm } from "./RedefinirSenhaForm";

// O token vem na URL: no-referrer impede que ele vaze no cabeçalho Referer para qualquer
// recurso ou link externo carregado a partir desta página.
export const metadata: Metadata = { title: "Nova senha · CAPE Aprova", robots: { index: false }, referrer: "no-referrer" };

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valido = await tokenRedefinicaoValido(token);

  return (
    <PublicShell largura={460}>
      {valido ? (
        <RedefinirSenhaForm token={token} />
      ) : (
        <div style={{ background: "#fff", border: "1px solid #DDD8CE", borderTop: "3px solid #8C2B22", borderRadius: 4, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>Link inválido ou expirado</div>
          <div style={{ fontSize: 13, color: "#4A5563", lineHeight: 1.6 }}>
            O link de redefinição vale por 30 minutos e só pode ser usado uma vez; ao pedir um novo, os anteriores deixam de valer.
          </div>
          <Link href="/esqueci-senha" style={{ fontSize: 13, fontWeight: 600, color: "#E01B22" }}>
            Pedir um novo link →
          </Link>
        </div>
      )}
      <Link href="/login" style={{ fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>
        ← Voltar para o login
      </Link>
    </PublicShell>
  );
}
