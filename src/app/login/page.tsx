import { LoginRegisterForm } from "./LoginRegisterForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const { senha } = await searchParams;
  return <LoginRegisterForm senhaRedefinida={senha === "redefinida"} />;
}
