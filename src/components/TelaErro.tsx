"use client";

import Link from "next/link";

// Tela comum de falha: diz o que houve sem detalhes técnicos (em produção o Next só manda
// ao navegador um código, o "digest", que casa com o log do servidor) e dá um caminho de
// volta. O código aparece para a pessoa poder informá-lo ao suporte.
export function TelaErro({
  titulo = "Algo deu errado",
  texto = "Não foi possível concluir esta operação. Nada do que já estava salvo foi perdido. Tente de novo; se o problema continuar, informe o código abaixo à CAPE.",
  codigo,
  tentarDeNovo,
  voltarPara = "/",
}: {
  titulo?: string;
  texto?: string;
  codigo?: string;
  tentarDeNovo?: () => void;
  voltarPara?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "56px 16px" }}>
      <div
        role="alert"
        style={{ maxWidth: 520, width: "100%", background: "#fff", border: "1px solid #DDD8CE", borderTop: "3px solid #8C2B22", borderRadius: 4, padding: 26, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>{titulo}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3B4653" }}>{texto}</div>
        {codigo && (
          <div style={{ fontSize: 12, color: "#7A7472" }}>
            Código: <span style={{ fontFamily: "var(--font-mono), monospace" }}>{codigo}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tentarDeNovo && (
            <button
              type="button"
              onClick={tentarDeNovo}
              style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Tentar de novo
            </button>
          )}
          <Link
            href={voltarPara}
            style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#231F20", borderRadius: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
