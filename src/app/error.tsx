"use client";

import { TelaErro } from "@/components/TelaErro";

// Falha nas telas públicas (login, acompanhamento, redefinição de senha).
export default function ErroPublico({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <TelaErro codigo={error.digest} tentarDeNovo={retry} voltarPara="/login" />;
}
