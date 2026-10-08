"use client";

import { useActionState, useState, useTransition } from "react";
import { uploadDocumentoAction } from "@/lib/actions/nova-actions";
import { problemaAntesDeEnviar } from "@/lib/upload-destino";
import { enviarDireto, mensagemDeFalhaNoEnvio } from "@/lib/upload-cliente";
import type { DocumentoTipo } from "@/generated/prisma/enums";

// Escolher o arquivo já envia: sobe direto ao Blob (com progresso) e depois registra.
export function useEnvioDocumento(solicitacaoId: string, tipo: DocumentoTipo) {
  const [state, registrar, registrando] = useActionState(uploadDocumentoAction.bind(null, solicitacaoId, tipo), null as { error?: string } | null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function enviar(file: File) {
    const destino = { destino: "documento", solicitacaoId, tipo } as const;
    const problema = problemaAntesDeEnviar(file, destino);
    setErroEnvio(problema);
    if (problema) return;
    setProgresso(0);
    try {
      const arq = await enviarDireto(file, destino, setProgresso);
      const fd = new FormData();
      fd.set("pathname", arq.pathname);
      fd.set("nomeArquivo", arq.nomeArquivo);
      startTransition(() => registrar(fd));
    } catch (e) {
      setErroEnvio(mensagemDeFalhaNoEnvio(e));
    } finally {
      setProgresso(null);
    }
  }

  const enviando = progresso !== null || registrando;
  return {
    enviar,
    enviando,
    rotuloEnvio: progresso !== null ? `Enviando… ${progresso}%` : registrando ? "Conferindo…" : null,
    erro: enviando ? null : (erroEnvio ?? state?.error ?? null),
    falhou: !!(erroEnvio ?? state?.error),
  };
}
