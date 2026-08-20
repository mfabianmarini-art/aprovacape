import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/nav";
import type { Role } from "@/generated/prisma/enums";

export async function getUserDisplay(userId: string, role: Role) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const iniciais = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  let papel = ROLE_LABEL[role];
  if (role === "CAPE_ANALISTA") papel += " · acesso total";
  else if (role === "SINDICO") papel += " · somente leitura";
  else if (role === "RESPONSAVEL_TECNICO" && user.creaCau) papel += ` · ${user.creaCau}`;
  else if (role === "PROPRIETARIO") {
    const lote = await prisma.lote.findFirst({ where: { proprietarioId: userId }, include: { quadra: true } });
    if (lote) papel += ` · ${lote.quadra.nome} L${lote.numero}`;
  }

  return { nome: user.name, papel, iniciais };
}
