"use client";

import { TelaErro } from "@/components/TelaErro";

// Falha no próprio layout raiz: substitui o documento inteiro, então traz <html>/<body>.
export default function ErroGlobal({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#F4F2ED", fontFamily: "Arial, Helvetica, sans-serif", color: "#231F20" }}>
        <title>Erro · CAPE Aprova</title>
        <TelaErro codigo={error.digest} tentarDeNovo={retry} voltarPara="/login" />
      </body>
    </html>
  );
}
