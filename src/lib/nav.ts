import type { Role } from "@/generated/prisma/enums";

export type ScreenId =
  | "resumo"
  | "fila"
  | "obras"
  | "vinculos"
  | "requerimentos"
  | "nova"
  | "empreendimentos"
  | "usuarios"
  | "documentos"
  | "relatorios";

export const SCREENS: Array<{
  id: ScreenId;
  label: string;
  path: string;
  roles: Role[];
  // Mesma tela, nome diferente conforme quem olha: o síndico publica documentos ali,
  // enquanto proprietário e RT a consultam como as normas que o projeto precisa atender.
  labelPorPapel?: Partial<Record<Role, string>>;
  // Abre um respiro visual antes deste item na barra lateral (ver Sidebar.tsx) — separa
  // o que a equipe CAPE usa no dia a dia do que é consultado com menos frequência.
  separadorAntes?: boolean;
  // Some dos outros itens de propósito: um número em cada entrada do menu vira ruído.
  // Só as três telas de fila (vínculo, obra, obras em andamento) mostram contador.
  mostrarContador?: boolean;
  // Das que mostram contador, só vínculo e obra pendente de aprovação viram alerta
  // (badge destacado, pulsando) quando o contador é maior que zero — são pedidos
  // parados esperando uma decisão da CAPE. "Obras em andamento" é acompanhamento, não
  // uma fila de aprovação, então mantém o número mas sem o alerta.
  alertaContador?: boolean;
}> = [
  { id: "resumo", label: "Resumo dos Loteamentos", path: "/resumo", roles: ["ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO"] },
  {
    id: "vinculos",
    label: "Aprovação de Vínculo",
    path: "/vinculos",
    roles: ["ADMIN_CAPE", "CAPE_ANALISTA"],
    mostrarContador: true,
    alertaContador: true,
  },
  {
    id: "fila",
    label: "Aprovação de Obra",
    path: "/fila",
    roles: ["ADMIN_CAPE", "CAPE_ANALISTA"],
    mostrarContador: true,
    alertaContador: true,
  },
  // Obra liberada sai da fila: não há mais nada a analisar nela, o que existe é
  // acompanhamento de execução (irregularidades e conclusão).
  { id: "obras", label: "Obras em andamento", path: "/obras", roles: ["ADMIN_CAPE", "CAPE_ANALISTA"], mostrarContador: true },
  { id: "relatorios", label: "Relatórios", path: "/relatorios", roles: ["ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO"] },
  // Admin/Analista CAPE cadastram e consultam os documentos dentro de Empreendimentos,
  // então para eles esta aba seria redundante.
  //
  // Posição: vem antes de "requerimentos"/"nova" para abrir o menu de proprietário e RT
  // — é a referência que eles consultam antes de elaborar o projeto, e homeForRole usa o
  // primeiro item da lista filtrada, então também vira a tela de entrada deles. Fica
  // depois de "resumo" para não mudar a home do síndico, que também enxerga esta aba.
  {
    id: "documentos",
    label: "Documentos técnicos",
    path: "/documentos",
    roles: ["SINDICO", "PROPRIETARIO", "RESPONSAVEL_TECNICO"],
    labelPorPapel: { PROPRIETARIO: "Normas para aprovação", RESPONSAVEL_TECNICO: "Normas para aprovação" },
  },
  { id: "requerimentos", label: "Meus requerimentos", path: "/requerimentos", roles: ["PROPRIETARIO", "RESPONSAVEL_TECNICO"] },
  { id: "nova", label: "Nova solicitação", path: "/nova", roles: ["PROPRIETARIO", "RESPONSAVEL_TECNICO"] },
  // Check-lists não tem entrada própria no menu: cada empreendimento segue sua própria
  // norma, então o check-list é aberto a partir do card do empreendimento, na tela
  // Empreendimentos — não faz sentido navegar até ele sem já estar olhando um empreendimento.
  //
  // Daqui para baixo: itens de uso menos frequente para a equipe CAPE (Empreendimentos,
  // Cadastrar Usuário) — separadorAntes abre o respiro visual que os afasta dos cinco de
  // cima (Resumo, Aprovação de Vínculo, Aprovação de Obra, Obras em andamento, Relatórios).
  { id: "empreendimentos", label: "Empreendimentos", path: "/empreendimentos", roles: ["ADMIN_CAPE", "CAPE_ANALISTA"], separadorAntes: true },
  // Só a equipe CAPE, que atende todos os empreendimentos. Síndico, proprietário e RT
  // pertencem a um empreendimento e são geridos dentro dele, na tela Empreendimentos.
  { id: "usuarios", label: "Cadastrar Usuário", path: "/usuarios", roles: ["ADMIN_CAPE", "CAPE_ANALISTA"] },
];

export function screensForRole(role: Role) {
  return SCREENS.filter((s) => s.roles.includes(role));
}

// Fonte única do nome da tela, para a barra lateral e o cabeçalho não divergirem.
export function labelDaTela(id: ScreenId, role: Role) {
  const screen = SCREENS.find((s) => s.id === id);
  return screen?.labelPorPapel?.[role] ?? screen?.label ?? "";
}

export function homeForRole(role: Role): string {
  return screensForRole(role)[0]?.path ?? "/login";
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN_CAPE: "Admin CAPE",
  CAPE_ANALISTA: "Analista CAPE",
  SINDICO: "Síndico",
  PROPRIETARIO: "Proprietário",
  RESPONSAVEL_TECNICO: "Responsável técnico",
};

export const ROLE_COLOR: Record<Role, { bg: string; fg: string }> = {
  ADMIN_CAPE: { bg: "#0B2E3F", fg: "#FFFFFF" },
  CAPE_ANALISTA: { bg: "#12455E", fg: "#FFFFFF" },
  SINDICO: { bg: "#DEDCF0", fg: "#3B3486" },
  RESPONSAVEL_TECNICO: { bg: "#DCE9F2", fg: "#12455E" },
  PROPRIETARIO: { bg: "#EDE9E1", fg: "#5A6270" },
};
