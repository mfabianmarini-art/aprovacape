// Vídeo tutorial da página "Como usar a plataforma". O endereço fica na variável
// VIDEO_TUTORIAL_URL (Vercel → Settings → Environment Variables), para trocar o vídeo sem
// mexer no código: basta colar o link do YouTube ou do Vimeo (pode ser "não listado").
// O link é convertido no endereço do player embutido; qualquer outro endereço é ignorado —
// só esses dois players estão liberados na política de segurança (next.config.ts).
export function embedDoVideo(url: string | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const id = (s: string | null | undefined) => (s && /^[\w-]{6,20}$/.test(s) ? s : null);

  // YouTube: watch?v=, youtu.be/, shorts/, embed/, live/. youtube-nocookie não grava
  // cookies de rastreamento enquanto o vídeo não é tocado.
  let yt: string | null = null;
  if (host === "youtu.be") yt = id(u.pathname.slice(1));
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    yt = id(u.searchParams.get("v")) ?? id(u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1]);
  }
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1`;

  // Vimeo: vimeo.com/123456789 ou, não listado, vimeo.com/123456789/abcdef1234.
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/^\/(?:video\/)?(\d{6,12})(?:\/([0-9a-f]{6,20}))?/);
    if (m) {
      const hash = m[2] ?? u.searchParams.get("h");
      return `https://player.vimeo.com/video/${m[1]}${hash && /^[0-9a-f]{6,20}$/.test(hash) ? `?h=${hash}` : ""}`;
    }
  }
  return null;
}
