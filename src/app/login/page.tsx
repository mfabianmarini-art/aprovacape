import { prisma } from "@/lib/prisma";
import { LoginRegisterForm } from "./LoginRegisterForm";

export default async function LoginPage() {
  const empreendimentos = await prisma.empreendimento.findMany({
    select: {
      id: true,
      nome: true,
      cidade: true,
      uf: true,
      quadras: {
        select: {
          id: true,
          nome: true,
          lotes: { select: { id: true, numero: true }, orderBy: { numero: "asc" } },
        },
        orderBy: { nome: "asc" },
      },
    },
    orderBy: { nome: "asc" },
  });

  return <LoginRegisterForm empreendimentos={empreendimentos} />;
}
