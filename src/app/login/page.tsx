import { getEmpreendimentosParaVinculo } from "@/lib/queries/vinculo";
import { LoginRegisterForm } from "./LoginRegisterForm";

export default async function LoginPage() {
  const empreendimentos = await getEmpreendimentosParaVinculo();
  return <LoginRegisterForm empreendimentos={empreendimentos} />;
}
