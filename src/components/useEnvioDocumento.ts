"use client";

import { useActionState, useState, useTransition } from "react";
import { documentoIdenticoAction, uploadDocumentoAction } from "@/lib/actions/nova-actions";
import { enviarDireto, mensagemDeFalhaNoEnvio, prepararEnvio } from "@/lib/upload-cliente";
import type { RegraArquivo } from "@/lib/upload-destino";

// Escolher o arquivo já envia: sobe direto ao Blob (com progresso) e depois registra.
// tipo: chave do documento (tipo padrão ou "p_<id>").
export function useEnvioDocumento(solicitacaoId: string, tipo: string, regra: RegraArquivo) {
  const [state, registrar, registrando] = useActionState(uploadDocumentoAction.bind(null, solicitacaoId, tipo), null as { error?: string } | null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function enviar(file: File) {
    const destino = { destino: "documento", solicitacaoId, tipo, regra } as const;
    setAviso(null);
    setPreparando(true);
    const prep = await prepararEnvio(file, destino).finally(() => setPreparando(false));
    setErroEnvio(prep.problema);
    if (prep.problema) return;
    // Mesmo arquivo que já está lá: nada a enviar, e nenhuma versão repetida guardada.
    if (prep.hash && (await documentoIdenticoAction(solicitacaoId, tipo, prep.hash).catch(() => false))) {
      setAviso("Este arquivo é idêntico ao já enviado — nada foi alterado.");
      return;
    }
    setProgresso(0);
    try {
      const arq = await enviarDireto(prep, destino, setProgresso);
      const fd = new FormData();
      fd.set("pathname", arq.pathname);
      fd.set("nomeArquivo", arq.nomeArquivo);
      fd.set("hash", arq.hash);
      startTransition(() => registrar(fd));
    } catch (e) {
      setErroEnvio(mensagemDeFalhaNoEnvio(e));
    } finally {
      setProgresso(null);
    }
  }

  const enviando = preparando || progresso !== null || registrando;
  return {
    enviar,
    enviando,
    rotuloEnvio: preparando ? "Preparando…" : progresso !== null ? `Enviando… ${progresso}%` : registrando ? "Conferindo…" : null,
    erro: enviando ? null : (erroEnvio ?? state?.error ?? aviso ?? null),
    falhou: !!(erroEnvio ?? state?.error),
  };
}
