import { NextResponse } from "next/server";
import { executarManutencao } from "@/lib/manutencao";

export const dynamic = "force-dynamic";
// 60 s cabe em qualquer plano da Vercel e sobra para o volume atual (listagem em páginas
// de 1000 arquivos).
export const maxDuration = 60;

// Disparada pela Vercel Cron (vercel.json), que manda "Authorization: Bearer $CRON_SECRET".
// Sem CRON_SECRET configurado a rota fica fechada.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }
  const resultado = await executarManutencao();
  console.log(JSON.stringify({ evento: "manutencao", ...resultado }));
  return NextResponse.json(resultado);
}
