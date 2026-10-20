// Arquivos que o RT anexa ao pedir vínculo: a procuração assinada pelo proprietário e os
// documentos de identidade (RG ou CNH) do proprietário e do próprio RT. Formato e tamanho
// são conferidos no envio direto (upload-destino.ts, destino "vinculo") e pelo conteúdo no
// servidor (upload-direto.ts, receberArquivo).
export const ACCEPT_PROCURACAO = ".pdf,.doc,.docx,image/png,image/jpeg,image/webp";
export const ACCEPT_DOCUMENTO_IDENTIDADE = ".pdf,image/png,image/jpeg,image/webp";
