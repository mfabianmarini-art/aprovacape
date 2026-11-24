import { mesmoCpf } from "@/lib/cpf";
import { mesmoDocumento } from "@/lib/cnpj";

// Contra quem o pedido de vínculo é conferido: o proprietário da matrícula, cadastrado no
// lote. Enquanto lotes antigos não tiverem esse campo, vale o CPF da conta vinculada, que
// é a única pista que existe. Sem nenhum dos dois não há conferência possível — o lote
// nunca teve dono registrado, e a aprovação segue por análise humana do documento.
//
// O proprietário pode ser pessoa jurídica: aí a chave é o CNPJ, e o responsável legal é
// quem assina a procuração pela empresa.
export type LoteParaConferencia = {
  titularNome: string | null;
  titularCpf: string | null;
  titularCnpj?: string | null;
  titularRepresentanteNome?: string | null;
  titularRepresentanteCpf?: string | null;
  proprietario: { name: string; cpf: string } | null;
};

export type PedidoParaConferencia = {
  ehRT: boolean;
  // CPF do próprio solicitante (proprietário pedindo o lote dele).
  cpf: string;
  // Proprietário que o RT declarou no pedido: CPF, ou CNPJ se for pessoa jurídica.
  vinculoPropNome: string | null;
  vinculoPropCpf: string | null;
  vinculoPropCnpj?: string | null;
};

// `documento` é o CPF ou o CNPJ, sem máscara (formatarDocumento distingue pelo tamanho).
export type TitularReferencia = {
  nome: string;
  documento: string;
  representante: { nome: string; cpf: string } | null;
};

export type Divergencia = { esperadoNome: string; esperadoDocumento: string; informadoNome: string; informadoDocumento: string };

export function referenciaDoLote(lote: LoteParaConferencia): TitularReferencia | null {
  if (lote.titularCnpj) {
    return {
      nome: lote.titularNome ?? "não informado",
      documento: lote.titularCnpj,
      representante: lote.titularRepresentanteCpf
        ? { nome: lote.titularRepresentanteNome ?? "não informado", cpf: lote.titularRepresentanteCpf }
        : null,
    };
  }
  if (lote.titularCpf) return { nome: lote.titularNome ?? "não informado", documento: lote.titularCpf, representante: null };
  if (lote.proprietario?.cpf) return { nome: lote.proprietario.name, documento: lote.proprietario.cpf, representante: null };
  return null;
}

// Uma pessoa (a conta de proprietário) responde por este titular? Pessoa física, se é
// ela mesma; empresa, se é o responsável legal cadastrado.
export function pessoaRespondePeloTitular(ref: TitularReferencia, cpf: string): boolean {
  return mesmoDocumento(ref.documento, cpf) || mesmoCpf(ref.representante?.cpf, cpf);
}

// O RT é conferido pelo proprietário que declarou; o proprietário, por si mesmo. Os dois
// respondem à mesma pergunta: quem está pedindo tem relação com o dono deste lote?
export function divergenciaDeTitular(
  lote: LoteParaConferencia,
  pedido: PedidoParaConferencia,
  nomeDoSolicitante: string,
): Divergencia | null {
  const ref = referenciaDoLote(lote);
  if (!ref) return null;

  if (!pedido.ehRT) {
    if (!pedido.cpf || pessoaRespondePeloTitular(ref, pedido.cpf)) return null;
    return { esperadoNome: ref.nome, esperadoDocumento: ref.documento, informadoNome: nomeDoSolicitante, informadoDocumento: pedido.cpf };
  }

  const informado = pedido.vinculoPropCnpj || pedido.vinculoPropCpf;
  if (!informado) return null;
  if (mesmoDocumento(ref.documento, informado)) return null;
  return {
    esperadoNome: ref.nome,
    esperadoDocumento: ref.documento,
    informadoNome: pedido.vinculoPropNome ?? "não informado",
    informadoDocumento: informado,
  };
}

// Lote adicional de um projeto: tem de ser do mesmo proprietário do lote principal.
// "divergente" trava a aprovação; "sem-referencia" (um dos lotes sem dono registrado)
// deixa a conferência para a matrícula anexada à solicitação.
export type TitularidadeEntreLotes =
  | { situacao: "confere" | "divergente"; principal: TitularReferencia; adicional: TitularReferencia }
  | { situacao: "sem-referencia"; principal: TitularReferencia | null; adicional: TitularReferencia | null };

export function titularidadeEntreLotes(principal: LoteParaConferencia, adicional: LoteParaConferencia): TitularidadeEntreLotes {
  const p = referenciaDoLote(principal);
  const a = referenciaDoLote(adicional);
  if (!p || !a) return { situacao: "sem-referencia", principal: p, adicional: a };
  return { situacao: mesmoDocumento(p.documento, a.documento) ? "confere" : "divergente", principal: p, adicional: a };
}

// Quem fica como RT do lote quando a CAPE desfaz a aprovação de um lote adicional. Só mexe
// no que aquela aprovação fez: não tira o RT que já respondia pelo lote, nem o que tem outro
// projeto nele. Em aprovação sem registro do que fez, quem desvincula decide (retirarRt).
export function rtAposDesvinculo(v: {
  rtAlterado: boolean | null;
  rtAnteriorId: string | null;
  rtDoLote: string | null;
  rtDoProjeto: string | null;
  retirarRt: boolean;
  temOutroProjeto: boolean;
}): { altera: false } | { altera: true; rtId: string | null } {
  if (!v.rtDoLote || v.rtDoLote !== v.rtDoProjeto || v.temOutroProjeto) return { altera: false };
  if (v.rtAlterado === true) return { altera: true, rtId: v.rtAnteriorId };
  if (v.rtAlterado === null && v.retirarRt) return { altera: true, rtId: null };
  return { altera: false };
}
