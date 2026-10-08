import type { Instrumentation } from "next";

// Todo erro do servidor vira uma linha JSON no log da Vercel (fácil de filtrar por
// "erro_servidor" ou pelo digest que a tela de erro mostra à pessoa) e, se ALERTA_EMAIL
// estiver configurado, um e-mail para a equipe — no máximo um por rota por hora, para uma
// falha em série não virar uma enxurrada.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  // Sem query string: /redefinir-senha?token=… levaria o token para o log.
  const caminho = request.path.split("?")[0];
  console.error(
    JSON.stringify({
      evento: "erro_servidor",
      digest: e.digest,
      mensagem: e.message,
      metodo: request.method,
      caminho,
      rota: context.routePath,
      tipo: context.routeType,
    }),
  );

  const destino = process.env.ALERTA_EMAIL;
  if (!destino || process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { registrarTentativa } = await import("@/lib/limite-taxa");
    if (await registrarTentativa("alerta", context.routePath)) return;
    const { enviarEmail, escaparHtml } = await import("@/lib/email");
    const linhas = [`Rota: ${context.routePath} (${context.routeType})`, `Requisição: ${request.method} ${caminho}`, `Código (digest): ${e.digest ?? "—"}`, `Mensagem: ${e.message}`];
    await enviarEmail({
      para: destino.split(",").map((s) => s.trim()),
      assunto: `CAPE Aprova — erro no servidor em ${context.routePath}`,
      texto: [...linhas, "", "Detalhes completos nos logs da Vercel (filtre por erro_servidor). Próximo alerta desta rota só daqui a 1 hora."].join("\n"),
      html: `<pre style="font-family:Consolas,monospace;font-size:13px">${escaparHtml(linhas.join("\n"))}</pre><p style="font-family:Arial;font-size:13px">Detalhes nos logs da Vercel (filtre por <b>erro_servidor</b>). Próximo alerta desta rota só daqui a 1 hora.</p>`,
    });
  } catch (falha) {
    console.error("[alerta] não foi possível avisar por e-mail:", falha);
  }
};
