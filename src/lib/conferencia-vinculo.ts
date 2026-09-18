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
