"use client";

import { TelaErro } from "@/components/TelaErro";

// Falha numa tela interna: a barra lateral (layout acima) continua de pé.
export default function ErroInterno({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <TelaErro codigo={error.digest} tentarDeNovo={retry} />;
}
