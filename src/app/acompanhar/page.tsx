import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { AcompanharForm } from "./AcompanharForm";

export const metadata: Metadata = { title: "Acompanhar solicitação · CAPE Aprova", robots: { index: false } };

// Entrada do proprietário, sem conta: protocolo + senha que o RT recebeu no envio.
export default async function AcompanharPage({ searchParams }: { searchParams: Promise<{ protocolo?: string }> }) {
  const { protocolo } = await searchParams;
  return (
    <PublicShell>
      <AcompanharForm protocoloInicial={protocolo ?? ""} />
      <Link href="/login" style={{ fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>
        É responsável técnico ou da equipe CAPE? Entrar na plataforma →
      </Link>
    </PublicShell>
  );
}
