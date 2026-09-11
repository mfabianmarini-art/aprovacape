import type { Role } from "@/generated/prisma/enums";

export type ScreenId =
  | "resumo"
  | "fila"
  | "vinculos"
  | "requerimentos"
  | "nova"
  | "empreendimentos"
  | "checklists"
  | "usuarios"
  | "documentos";

export const SCREENS: Array<{ id: ScreenId; label: string; path: string; roles: Role[] }> = [
  { id: "resumo", label: "Resumo do loteamento", path: "/resumo", roles: ["ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO"] },
  { id: "fila", label: "Fila de análise", path: "/fila", roles: ["ADMIN_CAPE", "CAPE_ANALISTA"] },
  { id: "vinculos", label: "Vínculos a validar", path: "/vinculos", roles: ["ADMIN_CAPE", "CAPE_ANALISTA"] },
  { id: "requerimentos", label: "Meus requerimentos", path: "/requerimentos", roles: ["PROPRIETARIO", "RESPONSAVEL_TECNICO"] },
  { id: "nova", label: "Nova solicitação", path: "/nova", roles: ["PROPRIETARIO", "RESPONSAVEL_TECNICO"] },
  { id: "empreendimentos", label: "Empreendimentos", path: "/empreendimentos", roles: ["ADMIN_CAPE", "CAPE_ANALISTA"] },
  { id: "checklists", label: "Check-lists", path: "/checklists", roles: ["ADMIN_CAPE", "CAPE_ANALISTA"] },
  // Só a equipe CAPE, que atende todos os empreendimentos. Síndico, proprietário e RT
  // pertencem a um empreendimento e são geridos dentro dele, na tela Empreendimentos.
  { id: "usuarios", label: "Equipe CAPE", path: "/usuarios", roles: ["ADMIN_CAPE", "CAPE_ANALISTA"] },
  // Só para quem apenas consulta a biblioteca: Admin/Analista CAPE cadastram e
  // veem os documentos dentro de Empreendimentos, então a aba seria redundante.
  // Fica por último em SCREENS de propósito: não deve virar a home de nenhum papel
  // (homeForRole usa o primeiro item da lista filtrada por papel).
  {
    id: "documentos",
    label: "Documentos técnicos",
    path: "/documentos",
    roles: ["SINDICO", "PROPRIETARIO", "RESPONSAVEL_TECNICO"],
  },
];

export function screensForRole(role: Role) {
  return SCREENS.filter((s) => s.roles.includes(role));
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
