"use client";

import { useEnvioDocumento } from "@/components/useEnvioDocumento";
import { docsObrigatorios, docsOpcionais, formatosTexto, infoDoc, type InfoDoc, type RegrasDoEmpreendimento } from "@/lib/status";

type Rascunho = {
  id: string;
  documentos: { chave: string; nomeArquivo: string }[];
  lote: { numero: string; quadra: { nome: string }; empreendimento: RegrasDoEmpreendimento };
  lotesAdicionais: { lote: { numero: string; quadra: { nome: string } } }[];
};


function UploadRow({
  solicitacaoId,
  tipo,
  info,
  existente,
  obrigatorio = true,
}: {
  solicitacaoId: string;
  tipo: string;
  info: InfoDoc;
  existente?: { nomeArquivo: string };
  obrigatorio?: boolean;
}) {
  const { enviar, enviando, rotuloEnvio, erro, falhou } = useEnvioDocumento(solicitacaoId, tipo, info);
  const ok = !!existente && !falhou;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 190px",
        alignItems: "center",
        gap: 14,
        border: `1px dashed ${ok ? "#C6DAC9" : "#C9C2B4"}`,
        borderRadius: 4,
        padding: "14px 16px",
        background: ok ? "#FBFCFA" : "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>
          {info.nome}{" "}
          <span style={{ fontSize: 11.5, fontWeight: 400, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
            {formatosTexto(info.extensoes, info.maxMB)}
          </span>
          {!obrigatorio && (
            <span style={{ fontSize: 11, fontWeight: 400, color: "#8B939C" }}> · opcional</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#7A7472" }}>{existente ? existente.nomeArquivo : info.dica}</div>
        {erro && <div style={{ fontSize: 11.5, color: "#8C2B22" }}>{erro}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: ok ? "#24603A" : obrigatorio ? "#8A5210" : "#8B939C" }}>
          {ok ? "enviado" : obrigatorio ? "pendente" : "não enviado"}
        </span>
        <input
          type="file"
          name="arquivo"
          accept={info.extensoes.join(",")}
          disabled={enviando}
          style={{ display: "none" }}
          id={`file-${tipo}`}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) enviar(file);
          }}
        />
        <label
          htmlFor={`file-${tipo}`}
          style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "7px 11px", fontSize: 12, fontWeight: 600, cursor: enviando ? "wait" : "pointer", whiteSpace: "nowrap" }}
        >
          {rotuloEnvio ?? (existente ? "Substituir" : "Selecionar arquivo")}
        </label>
      </div>
    </div>
  );
}

export function Step2Uploads({ rascunho }: { rascunho: Rascunho }) {
  const obrigatorios = docsObrigatorios(rascunho.lotesAdicionais.length, rascunho.lote.empreendimento);
  const enviados = obrigatorios.filter((t) => rascunho.documentos.find((d) => d.chave === t)).length;
  const pendentes = obrigatorios.length - enviados;
  const opcionais = docsOpcionais(rascunho.lotesAdicionais.length, rascunho.lote.empreendimento, rascunho.documentos.map((d) => d.chave));
  const exigeUnificacao = obrigatorios.includes("PROJETO_APROVADO_PREFEITURA") && obrigatorios.includes("ART_UNIFICACAO");

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "#4A5563", background: "#FAF9F6", border: "1px solid #EDE9E1", borderRadius: 4, padding: "9px 12px", lineHeight: 1.5 }}>
        Dica: exporte os PDFs direto do programa de projeto (opção &quot;PDF otimizado&quot; ou &quot;tamanho mínimo&quot;) e digitalize
        documentos em papel entre 150 e 300 dpi. Arquivos menores sobem mais rápido e abrem mais rápido na análise.
      </div>
      {rascunho.lotesAdicionais.length > 0 && (
        <div style={{ fontSize: 12, color: "#8A5210", background: "#FBF5EA", border: "1px solid #EAD9BC", borderRadius: 4, padding: "9px 12px", lineHeight: 1.5 }}>
          Projeto de {rascunho.lotesAdicionais.length + 1} lotes:{" "}
          <strong>
            {[rascunho.lote, ...rascunho.lotesAdicionais.map((a) => a.lote)].map((l) => `${l.quadra.nome} L${l.numero}`).join(", ")}
          </strong>
          .{exigeUnificacao && " A aprovação prévia na Prefeitura é obrigatória: anexe o projeto aprovado e a ART/RRT da unificação."} Se anexar a
          matrícula ou a capa do IPTU, junte as de todos os lotes num único PDF.
        </div>
      )}
      <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>Documentos obrigatórios</div>
      {obrigatorios.map((tipo) => (
        <UploadRow
          key={tipo}
          solicitacaoId={rascunho.id}
          tipo={tipo}
          info={infoDoc(tipo, rascunho.lote.empreendimento)}
          existente={rascunho.documentos.find((d) => d.chave === tipo)}
        />
      ))}
      {opcionais.length > 0 && (
        <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472", marginTop: 6 }}>Documentos opcionais</div>
      )}
      {opcionais.map((tipo) => (
        <UploadRow
          key={tipo}
          solicitacaoId={rascunho.id}
          tipo={tipo}
          info={infoDoc(tipo, rascunho.lote.empreendimento)}
          existente={rascunho.documentos.find((d) => d.chave === tipo)}
          obrigatorio={false}
        />
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", borderTop: "1px solid #EDE9E1", paddingTop: 16 }}>
        <div style={{ fontSize: 12.5, color: "#4A5563" }}>
          {pendentes === 0 ? "Todos os documentos obrigatórios do check-list foram anexados." : `${pendentes} documento(s) obrigatório(s) pendente(s).`}
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <a
            href={`/nova?rascunho=${rascunho.id}&passo=1`}
            style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            Voltar
          </a>
          {pendentes === 0 && (
            <a
              href={`/nova?rascunho=${rascunho.id}&passo=3`}
              style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "10px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
            >
              Continuar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
