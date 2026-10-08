import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { EsqueciSenhaForm } from "./EsqueciSenhaForm";

export const metadata: Metadata = { title: "Esqueci minha senha · CAPE Aprova", robots: { index: false } };

export default function EsqueciSenhaPage() {
  return (
    <PublicShell largura={460}>
      <EsqueciSenhaForm />
      <Link href="/login" style={{ fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>
        ← Voltar para o login
      </Link>
    </PublicShell>
  );
}
