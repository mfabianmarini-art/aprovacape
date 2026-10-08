import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const preview = process.env.VERCEL_ENV === "preview";

// CSP sem nonce: o Next injeta scripts inline para o payload do RSC, e nonce obrigaria
// renderizar todas as páginas por requisição. O ganho principal vem do resto da política —
// nada carregado de fora, nenhum <object>, formulários só para o próprio app e o app não
// pode ser embutido em página alheia (clickjacking nas telas da CAPE).
// Uploads diretos vão do navegador à API do Vercel Blob (vercel.com/api/blob).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}${preview ? " https://vercel.live" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://vercel.com https://*.blob.vercel-storage.com${preview ? " https://vercel.live wss://ws-us3.pusher.com" : ""}`,
  `frame-src 'self'${preview ? " https://vercel.live" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Server Actions default to a 1 MB request body — well under the 10 MB planta
      // upload and 15 MB documento upload this app validates for. Raised with headroom
      // for multipart/form-data overhead.
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
