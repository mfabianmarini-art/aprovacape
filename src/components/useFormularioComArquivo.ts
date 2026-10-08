"use client";

import { useState, useTransition } from "react";
import { enviarDireto, mensagemDeFalhaNoEnvio, prepararEnvio } from "@/lib/upload-cliente";
import type { DestinoUpload } from "@/lib/upload-destino";

// Formulário com um campo de arquivo: no envio, o arquivo sobe direto ao Blob (reduzido,
// se for imagem) e a action recebe pathname/nomeArquivo/hash no lugar dele — o corpo de
// uma requisição à função da Vercel não passa de 4,5 MB.
export function useFormularioComArquivo(formAction: (fd: FormData) => void, destino: DestinoUpload, campo = "arquivo") {
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (progresso !== null) return;
    const fd = new FormData(e.currentTarget);
    const file = fd.get(campo);
    fd.delete(campo);
    setErroEnvio(null);
    if (file instanceof File && file.size > 0) {
      const prep = await prepararEnvio(file, destino);
      if (prep.problema) return setErroEnvio(prep.problema);
      setProgresso(0);
      try {
        const arq = await enviarDireto(prep, destino, setProgresso);
        fd.set("pathname", arq.pathname);
        fd.set("nomeArquivo", arq.nomeArquivo);
        fd.set("hash", arq.hash);
      } catch (err) {
        setProgresso(null);
        return setErroEnvio(mensagemDeFalhaNoEnvio(err));
      }
      setProgresso(null);
    }
    startTransition(() => formAction(fd));
  }

  return { onSubmit, progresso, erroEnvio, enviando: progresso !== null };
}
