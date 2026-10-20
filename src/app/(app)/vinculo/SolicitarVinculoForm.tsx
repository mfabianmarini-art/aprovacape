"use client";

import { useActionState, useState, useTransition } from "react";
import { enviarVarios, mensagemDeFalhaNoEnvio, ProblemaNoArquivo } from "@/lib/upload-cliente";
import { solicitarVinculoAction, type VinculoState } from "@/lib/actions/vinculo-actions";
import { ACCEPT_DOCUMENTO_IDENTIDADE, ACCEPT_PROCURACAO } from "@/lib/vinculo-comprovacao";
import { ProprietarioDeclaradoFields } from "@/components/ProprietarioDeclaradoFields";
import type { getEmpreendimentosParaVinculo } from "@/lib/queries/vinculo";

type Empreendimentos = Awaited<ReturnType<typeof getEmpreendimentosParaVinculo>>;

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5, background: "#fff" };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };

// Documentos do pedido de vínculo do RT, na ordem em que a action os espera.
const ARQUIVOS = [
  {
    campo: "procuracao",
    titulo: "Procuração do proprietário",
    rotulo: "a procuração do proprietário",
    accept: ACCEPT_PROCURACAO,
    ajuda: "Procuração assinada pelo proprietário do lote — PDF, Word ou imagem, até 10 MB.",
  },
  {
    campo: "docProprietario",
    titulo: "RG ou CNH do proprietário",
    rotulo: "o RG ou a CNH do proprietário",
    accept: ACCEPT_DOCUMENTO_IDENTIDADE,
    ajuda: "Frente e verso legíveis — PDF ou foto, até 10 MB.",
  },
  {
    campo: "docRT",
    titulo: "RG ou CNH do responsável técnico",
    rotulo: "o seu RG ou CNH",
    accept: ACCEPT_DOCUMENTO_IDENTIDADE,
    ajuda: "O seu documento de identidade, frente e verso — PDF ou foto, até 10 MB.",
  },
] as const;

export function SolicitarVinculoForm({ empreendimentos, ehRT, usuarioId }: { empreendimentos: Empreendimentos; ehRT: boolean; usuarioId: string }) {
  const [state, formAction, salvando] = useActionState<VinculoState, FormData>(solicitarVinculoAction, null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const pending = salvando || progresso !== null;

  // Os arquivos sobem direto ao Blob antes da action (limite de 4,5 MB por requisição na
  // Vercel); a action recebe só os caminhos e confere cada arquivo. Fotos de documento são
  // reduzidas no navegador antes do envio.
  async function solicitar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    setErroEnvio(null);
    if (ehRT) {
      const files = ARQUIVOS.map((a) => fd.get(a.campo));
      ARQUIVOS.forEach((a) => fd.delete(a.campo));
      const faltando = ARQUIVOS.find((_, i) => !(files[i] instanceof File) || (files[i] as File).size === 0);
      if (faltando) return setErroEnvio(`Anexe ${faltando.rotulo}.`);
      setProgresso(0);
      try {
        const enviados = await enviarVarios(files as File[], { destino: "vinculo", usuarioId }, setProgresso);
        ARQUIVOS.forEach((a, i) => {
          fd.set(`${a.campo}Pathname`, enviados[i].pathname);
          fd.set(`${a.campo}Nome`, enviados[i].nomeArquivo);
          fd.set(`${a.campo}Hash`, enviados[i].hash);
        });
      } catch (err) {
        setProgresso(null);
        return setErroEnvio(err instanceof ProblemaNoArquivo ? err.message : mensagemDeFalhaNoEnvio(err));
      }
      setProgresso(null);
    }
    startTransition(() => formAction(fd));
  }
  const [empId, setEmpId] = useState(empreendimentos[0]?.id ?? "");
  const emp = empreendimentos.find((e) => e.id === empId) ?? empreendimentos[0];
  const [quadraId, setQuadraId] = useState(emp?.quadras[0]?.id ?? "");
  const quadra = emp?.quadras.find((q) => q.id === quadraId) ?? emp?.quadras[0];

  if (state?.ok) {
    return (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "#F3F8F4", border: "1px solid #C6DAC9", borderRadius: 4, padding: "14px 16px", fontSize: 13, color: "#24603A", lineHeight: 1.5 }}>
          Pedido enviado. A CAPE confere o vínculo e, aprovado, o lote passa a aparecer em Nova solicitação.
        </div>
        <a href="/requerimentos" style={{ alignSelf: "flex-start", fontSize: 13, fontWeight: 600 }}>
          Voltar para Meus requerimentos
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={solicitar} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 90px", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Empreendimento</span>
          <select
            value={empId}
            onChange={(e) => {
              setEmpId(e.target.value);
              const next = empreendimentos.find((x) => x.id === e.target.value);
              setQuadraId(next?.quadras[0]?.id ?? "");
            }}
            style={inputStyle}
          >
            {empreendimentos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome} — {e.cidade}/{e.uf}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Quadra</span>
          <select value={quadraId} onChange={(e) => setQuadraId(e.target.value)} style={{ ...inputStyle, padding: "10px 8px" }}>
            {emp?.quadras.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nome}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Lote</span>
          {/* key reinicia a seleção quando a quadra muda, senão o navegador guarda o índice anterior */}
          <select key={quadra?.id} name="loteId" required style={{ ...inputStyle, padding: "10px 8px" }}>
            {quadra?.lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.numero}
              </option>
            ))}
          </select>
        </label>
      </div>

      {ehRT ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ARQUIVOS.map((a) => (
            <label key={a.campo} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelTextStyle}>{a.titulo}</span>
              <input name={a.campo} type="file" required accept={a.accept} style={{ ...inputStyle, fontSize: 12.5 }} />
              <span style={{ fontSize: 11.5, color: "#7A7472" }}>{a.ajuda}</span>
            </label>
          ))}
        </div>
      ) : (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Matrícula do lote</span>
          <input name="comprovacao" required placeholder="000.000" style={inputStyle} />
        </label>
      )}

      {ehRT && <ProprietarioDeclaradoFields inputStyle={inputStyle} labelStyle={labelTextStyle} />}

      {(erroEnvio ?? state?.error) && !pending && <div style={{ fontSize: 12.5, color: "#8C2B22" }}>{erroEnvio ?? state?.error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 9, borderTop: "1px solid #EDE9E1", paddingTop: 16 }}>
        <a
          href="/requerimentos"
          style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          Voltar
        </a>
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
        >
          {progresso !== null ? `Enviando documentos… ${progresso}%` : salvando ? "Enviando…" : "Solicitar vínculo"}
        </button>
      </div>
    </form>
  );
}
