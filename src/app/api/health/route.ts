import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Para um monitor externo de disponibilidade (UptimeRobot, Better Stack…): 200 quando o
// app responde e alcança o banco, 503 quando não. Público e sem detalhes internos.
export async function GET() {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", bancoMs: Date.now() - t0 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "indisponivel" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
