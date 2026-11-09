import { mesmoCpf } from "@/lib/cpf";

// Contra quem o pedido de vínculo é conferido: o proprietário da matrícula, cadastrado no
// lote. Enquanto lotes antigos não tiverem esse campo, vale o CPF da conta vinculada, que
// é a única pista que existe. Sem nenhum dos dois não há conferência possível — o lote
// nunca teve dono registrado, e a aprovação segue por análise humana do documento.
export type LoteParaConferencia = {
  titularNome: string | null;
  titularCpf: string | null;
  proprietario: { name: string; cpf: string } | null;
};

export type PedidoParaConferencia = {
  ehRT: boolean;
  // CPF do próprio solicitante (proprietário pedindo o lote dele).
  cpf: string;
  // Proprietário que o RT declarou no pedido.
  vinculoPropNome: string | null;
  vinculoPropCpf: string | null;
};

export type Divergencia = { esperadoNome: string; esperadoCpf: string; informadoNome: string; informadoCpf: string };

export function referenciaDoLote(lote: LoteParaConferencia) {
  if (lote.titularCpf) return { nome: lote.titularNome ?? "não informado", cpf: lote.titularCpf };
  if (lote.proprietario?.cpf) return { nome: lote.proprietario.name, cpf: lote.proprietario.cpf };
  return null;
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

  const informadoCpf = pedido.ehRT ? pedido.vinculoPropCpf : pedido.cpf;
  const informadoNome = pedido.ehRT ? (pedido.vinculoPropNome ?? "não informado") : nomeDoSolicitante;
  if (!informadoCpf) return null;
  if (mesmoCpf(ref.cpf, informadoCpf)) return null;

  return { esperadoNome: ref.nome, esperadoCpf: ref.cpf, informadoNome, informadoCpf };
}

// Lote adicional de um projeto: tem de ser do mesmo proprietário do lote principal.
// "divergente" trava a aprovação; "sem-referencia" (um dos lotes sem dono registrado)
// deixa a conferência para a matrícula anexada à solicitação.
export type TitularidadeEntreLotes =
  | { situacao: "confere" | "divergente"; principal: { nome: string; cpf: string }; adicional: { nome: string; cpf: string } }
  | { situacao: "sem-referencia"; principal: { nome: string; cpf: string } | null; adicional: { nome: string; cpf: string } | null };

export function titularidadeEntreLotes(principal: LoteParaConferencia, adicional: LoteParaConferencia): TitularidadeEntreLotes {
  const p = referenciaDoLote(principal);
  const a = referenciaDoLote(adicional);
  if (!p || !a) return { situacao: "sem-referencia", principal: p, adicional: a };
  return { situacao: mesmoCpf(p.cpf, a.cpf) ? "confere" : "divergente", principal: p, adicional: a };
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
