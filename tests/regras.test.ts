// Testes das regras puras (sem banco nem rede). Rodam no CI a cada push: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { conteudoConfere, validarDocumentoEnviado, contentTypeDe } from "@/lib/upload-documento";
import { problemaAntesDeEnviar, regraDoDestino } from "@/lib/upload-destino";
import { problemaNaSenha } from "@/lib/redefinicao-senha";
import { contentDisposition } from "@/lib/content-disposition";
import { podeVerArquivosDaSolicitacao } from "@/lib/acesso-arquivos";
import { fimDaGuarda } from "@/lib/contrato";
import { ipDaRequisicao } from "@/lib/limite-taxa";
import { formatarTamanho } from "@/lib/arquivos-formato";

const bytes = (s: string | number[]) => (typeof s === "string" ? new TextEncoder().encode(s) : new Uint8Array(s));
const MB = 1024 * 1024;

test("formato conferido pelo conteúdo, não pelo nome", () => {
  assert.ok(conteudoConfere("a.pdf", bytes("%PDF-1.7\n")));
  assert.ok(!conteudoConfere("a.pdf", bytes("<html><script>")));
  assert.ok(conteudoConfere("a.png", bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])));
  assert.ok(conteudoConfere("a.jpg", bytes([0xff, 0xd8, 0xff, 0xe0])));
  assert.ok(conteudoConfere("a.webp", bytes("RIFF\0\0\0\0WEBPVP8 ")));
  assert.ok(conteudoConfere("a.zip", bytes([0x50, 0x4b, 0x03, 0x04])));
  assert.ok(conteudoConfere("a.docx", bytes([0x50, 0x4b, 0x03, 0x04])));
  assert.ok(conteudoConfere("a.doc", bytes([0xd0, 0xcf, 0x11, 0xe0])));
  for (const v of ["AC1015", "AC1024", "AC1032"]) assert.ok(conteudoConfere("a.dwg", bytes(v)), v);
  assert.ok(!conteudoConfere("a.dwg", bytes("%PDF-1")));
  assert.ok(!conteudoConfere("a.exe", bytes("MZ")), "extensão desconhecida nunca confere");
});

test("documento da solicitação: formato, tamanho e conteúdo", () => {
  const pdf = { nome: "planta.pdf", tamanho: 1000, inicio: bytes("%PDF-1.4\n") };
  assert.equal(validarDocumentoEnviado(pdf, "PROJETO_ARQUITETONICO"), null);
  assert.match(validarDocumentoEnviado({ ...pdf, tamanho: 6 * MB }, "PROJETO_ARQUITETONICO")!, /maior que 5 MB/);
  assert.match(validarDocumentoEnviado({ ...pdf, inicio: bytes("<html>") }, "PROJETO_ARQUITETONICO")!, /não é um PDF válido/);
  assert.match(validarDocumentoEnviado({ ...pdf, nome: "planta.dwg" }, "PROJETO_ARQUITETONICO")!, /Formato não aceito/);
  assert.equal(validarDocumentoEnviado({ nome: "p.dwg", tamanho: 1000, inicio: bytes("AC1027") }, "PROJETO_ARQUITETONICO_DWG"), null);
});

test("tipo servido sai da extensão validada", () => {
  assert.equal(contentTypeDe("x.pdf"), "application/pdf");
  assert.equal(contentTypeDe("x.dwg"), "application/octet-stream");
  assert.equal(contentTypeDe("x.html"), "application/octet-stream");
});

test("destinos de upload direto: pasta e limites", () => {
  assert.equal(regraDoDestino({ destino: "evidencia", solicitacaoId: "s1" }).pasta, "documentos/irregularidades/s1/");
  assert.equal(regraDoDestino({ destino: "planta", empreendimentoId: "e1" }).pasta, "plantas/e1/");
  assert.equal(regraDoDestino({ destino: "tecnico", empreendimentoId: "e1" }).maxBytes, 20 * MB);
  const f = (nome: string, tam: number) => ({ name: nome, size: tam }) as File;
  assert.equal(problemaAntesDeEnviar(f("a.pdf", 10), { destino: "alvara", solicitacaoId: "s" }), null);
  assert.match(problemaAntesDeEnviar(f("a.svg", 10), { destino: "planta", empreendimentoId: "e" })!, /Formato não aceito/);
  assert.match(problemaAntesDeEnviar(f("a.pdf", 0), { destino: "alvara", solicitacaoId: "s" })!, /vazio/);
});

test("política de senha", () => {
  const conta = { email: "ana@x.com", cpf: "12345678909" };
  assert.match(problemaNaSenha("curta", "curta", conta)!, /pelo menos 8/);
  assert.match(problemaNaSenha("x".repeat(73), "x".repeat(73), conta)!, /longa demais/);
  assert.match(problemaNaSenha("senha-boa-1", "senha-boa-2", conta)!, /não coincidem/);
  assert.match(problemaNaSenha("ANA@X.COM", "ANA@X.COM", conta)!, /e-mail ou CPF/);
  assert.match(problemaNaSenha("123.456.789-09", "123.456.789-09", conta)!, /e-mail ou CPF/);
  assert.equal(problemaNaSenha("uma frase longa", "uma frase longa", conta), null);
  // Conta interna (marcador no lugar do CPF): senha sem dígitos não pode ser barrada.
  assert.equal(problemaNaSenha("semdigitos", "semdigitos", { email: "a@cape", cpf: "INTERNO-1" }), null);
});

test("Content-Disposition aceita qualquer nome sem quebrar o cabeçalho", () => {
  const h = contentDisposition("inline", "Projeto – versão ñ.pdf");
  assert.match(h, /^inline; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
});

test("acesso aos arquivos de uma solicitação", () => {
  const sol = { criadoPorId: "rtAntigo", lote: { proprietarioId: "dono", rtId: "rt", empreendimento: { sindicoId: "sind" } } };
  assert.ok(podeVerArquivosDaSolicitacao({ id: "x", role: "CAPE_ANALISTA" }, sol));
  assert.ok(podeVerArquivosDaSolicitacao({ id: "sind", role: "SINDICO" }, sol));
  assert.ok(!podeVerArquivosDaSolicitacao({ id: "outroSindico", role: "SINDICO" }, sol), "síndico de outro empreendimento");
  assert.ok(podeVerArquivosDaSolicitacao({ id: "rt", role: "RESPONSAVEL_TECNICO" }, sol));
  assert.ok(podeVerArquivosDaSolicitacao({ id: "rtAntigo", role: "RESPONSAVEL_TECNICO" }, sol), "autor do protocolo");
  assert.ok(!podeVerArquivosDaSolicitacao({ id: "intruso", role: "RESPONSAVEL_TECNICO" }, sol));
});

test("guarda contratual: 30 dias após a rescisão", () => {
  assert.equal(fimDaGuarda(new Date("2026-01-01T12:00:00Z")).toISOString(), "2026-01-31T12:00:00.000Z");
});

test("IP da requisição pelos cabeçalhos da Vercel", () => {
  assert.equal(ipDaRequisicao(new Headers({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" })), "1.2.3.4");
  assert.equal(ipDaRequisicao(new Headers({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" })), "5.6.7.8");
});

test("tamanho legível", () => {
  assert.equal(formatarTamanho(512), "512 B");
  assert.equal(formatarTamanho(1.5 * MB), "1,5 MB");
});

test("prazo em dias úteis: fim de semana e feriados nacionais não contam", async () => {
  const { diasUteisEntre, diasUteisRestantes } = await import("@/lib/prazo");
  const d = (s: string) => new Date(`${s}T12:00:00-03:00`);
  assert.equal(diasUteisEntre(d("2026-10-16"), d("2026-10-19")), 1, "sexta → segunda: 1 dia útil");
  assert.equal(diasUteisEntre(d("2026-10-09"), d("2026-10-13")), 1, "12/10 (feriado) não conta");
  assert.equal(diasUteisEntre(d("2026-04-02"), d("2026-04-06")), 1, "Sexta-feira Santa (03/04/2026) não conta");
  assert.equal(diasUteisEntre(d("2026-10-19"), d("2026-10-19")), 0);
  assert.equal(diasUteisRestantes({ prazoDias: 10, prazoInicioEm: null }), null, "sem validação documental, o prazo não corre");
  assert.equal(diasUteisRestantes({ prazoDias: 10, prazoInicioEm: d("2026-10-01") }, d("2026-10-15")), 1, "15/10: 9 úteis passados (12/10 feriado)");
});

test("vídeo tutorial: links do YouTube e do Vimeo viram o player embutido", async () => {
  const { embedDoVideo } = await import("@/lib/video-tutorial");
  const yt = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1";
  assert.equal(embedDoVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s"), yt);
  assert.equal(embedDoVideo("https://youtu.be/dQw4w9WgXcQ?si=abc"), yt);
  assert.equal(embedDoVideo("https://youtube.com/shorts/dQw4w9WgXcQ"), yt);
  assert.equal(embedDoVideo("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789");
  assert.equal(embedDoVideo("https://vimeo.com/123456789/abcdef1234"), "https://player.vimeo.com/video/123456789?h=abcdef1234");
  assert.equal(embedDoVideo(""), null);
  assert.equal(embedDoVideo(undefined), null);
  assert.equal(embedDoVideo("https://exemplo.com/video.mp4"), null, "outros endereços não são embutidos");
  assert.equal(embedDoVideo("javascript:alert(1)"), null);
});
