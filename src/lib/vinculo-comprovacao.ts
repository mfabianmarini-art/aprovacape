const MAX_AUTORIZACAO_BYTES = 10 * 1024 * 1024;
const TIPOS_AUTORIZACAO = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const ACCEPT_AUTORIZACAO = ".pdf,.doc,.docx,image/png,image/jpeg,image/webp";

// Autorização assinada pelo proprietário que o RT anexa ao pedir vínculo. Tipo e tamanho
// restritos porque um dos formulários que a recebe (/login) é público.
export function autorizacaoInvalida(file: File): string | null {
  if (!TIPOS_AUTORIZACAO.has(file.type)) return "Envie um PDF, Word (.doc/.docx) ou imagem (PNG/JPG/WEBP).";
  if (file.size > MAX_AUTORIZACAO_BYTES) return "Arquivo maior que 10 MB.";
  return null;
}
