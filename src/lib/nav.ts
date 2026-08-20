import type { Role } from "@/generated/prisma/enums";

export type ScreenId =
  | "resumo"
  | "fila"
  | "requerimentos"
  | "nova"
  | "empreendimentos"
  | "checklists"
  | "usuarios";

export const SCREENS: Array<{ id: ScreenId; label: string; path: string; roles: Role[] }> = [
  { id: "resumo", label: "Resumo do loteamento", path: "/resumo", roles: ["CAPE_ANALISTA", "SINDICO"] },
  { id: "fila", label: "Fila de análise", path: "/fila", roles: ["CAPE_ANALISTA"] },
  { id: "requerimentos", label: "Meus requerimentos", path: "/requerimentos", roles: ["PROPRIETARIO", "RESPONSAVEL_TECNICO"] },
  { id: "nova", label: "Nova solicitação", path: "/nova", roles: ["PROPRIETARIO", "RESPONSAVEL_TECNICO"] },
  { id: "empreendimentos", label: "Empreendimentos", path: "/empreendimentos", roles: ["CAPE_ANALISTA"] },
  { id: "checklists", label: "Check-lists", path: "/checklists", roles: ["CAPE_ANALISTA"] },
  { id: "usuarios", label: "Usuários", path: "/usuarios", roles: ["CAPE_ANALISTA"] },
];

export function screensForRole(role: Role) {
  return SCREENS.filter((s) => s.roles.includes(role));
}

export function homeForRole(role: Role): string {
  return screensForRole(role)[0]?.path ?? "/login";
}

export const ROLE_LABEL: Record<Role, string> = {
  CAPE_ANALISTA: "Analista CAPE",
  SINDICO: "Síndico",
  PROPRIETARIO: "Proprietário",
  RESPONSAVEL_TECNICO: "Responsável técnico",
};
