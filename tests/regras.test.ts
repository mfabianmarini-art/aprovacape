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
import { DOC_REGRAS } from "@/lib/status";

// Empreendimentos sem regra gravada pela CAPE: vale o padrão da plataforma.
const outro = { nome: "Outro Residencial", regrasDocumentos: [] };
const quinta = { nome: "Quinta da Primavera", regrasDocumentos: [] };

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
  assert.equal(validarDocumentoEnviado(pdf, DOC_REGRAS.PROJETO_ARQUITETONICO), null);
  assert.match(validarDocumentoEnviado({ ...pdf, tamanho: 6 * MB }, DOC_REGRAS.PROJETO_ARQUITETONICO)!, /maior que 5 MB/);
  assert.match(validarDocumentoEnviado({ ...pdf, inicio: bytes("<html>") }, DOC_REGRAS.PROJETO_ARQUITETONICO)!, /não é um PDF válido/);
  assert.match(validarDocumentoEnviado({ ...pdf, nome: "planta.dwg" }, DOC_REGRAS.PROJETO_ARQUITETONICO)!, /Formato não aceito/);
  assert.equal(validarDocumentoEnviado({ nome: "p.dwg", tamanho: 1000, inicio: bytes("AC1027") }, DOC_REGRAS.PROJETO_ARQUITETONICO_DWG), null);
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

test("documentos obrigatórios: projeto em mais de um lote exige os da unificação", async () => {
  const { docsObrigatorios, DOC_OPCIONAIS, DOC_PROJETO_CONJUNTO } = await import("@/lib/status");
  for (const t of DOC_PROJETO_CONJUNTO) {
    assert.ok(!docsObrigatorios(0, outro).includes(t), `${t} não vale para um lote só`);
    assert.ok(docsObrigatorios(2, outro).includes(t), `${t} vale para vários lotes`);
  }
  for (const t of ["MATRICULA", "ART_RRT_EXECUCAO", "CAPA_IPTU", "PROJETO_PAISAGISTICO"] as const) {
    assert.ok(DOC_OPCIONAIS.includes(t));
    assert.ok(!docsObrigatorios(2, quinta).includes(t), `${t} é opcional`);
  }
});

test("área de intervenção sempre com duas casas decimais", async () => {
  const { formatArea } = await import("@/lib/status");
  assert.equal(formatArea(0), "0,00");
  assert.equal(formatArea(150), "150,00");
  assert.equal(formatArea(87.5), "87,50");
  assert.equal(formatArea(1250.126), "1.250,13");
});

test("responsável pela execução: nome, registro e e-mail válidos", async () => {
  const { rtExecucaoSchema } = await import("@/lib/rt-execucao");
  const ok = { rtExecNome: "Ana Souza", rtExecRegistro: "CAU A123456-7", rtExecEmail: "ana@exemplo.com" };
  assert.ok(rtExecucaoSchema.safeParse(ok).success);
  assert.ok(!rtExecucaoSchema.safeParse({ ...ok, rtExecNome: "" }).success);
  assert.ok(!rtExecucaoSchema.safeParse({ ...ok, rtExecRegistro: " " }).success);
  assert.ok(!rtExecucaoSchema.safeParse({ ...ok, rtExecEmail: "ana" }).success);
});

test("documentos exigidos: regra da CAPE prevalece sobre o padrão", async () => {
  const { docsObrigatorios, docsOpcionais, DOC_TODOS, DOC_LABEL } = await import("@/lib/status");
  assert.deepEqual([...DOC_TODOS].sort(), Object.keys(DOC_LABEL).filter((t) => t !== "PERSONALIZADO").sort(), "todo documento padrão tem regra");
  const emp = {
    nome: "Outro Residencial",
    regrasDocumentos: [
      { tipo: "MATRICULA" as const, exigencia: "OBRIGATORIO" as const },
      { tipo: "MEMORIAL_DESCRITIVO" as const, exigencia: "OPCIONAL" as const },
      { tipo: "CAPA_IPTU" as const, exigencia: "NAO_SOLICITADO" as const },
      { tipo: "ART_UNIFICACAO" as const, exigencia: "OBRIGATORIO" as const },
    ],
  };
  const obrig = docsObrigatorios(0, emp);
  assert.ok(obrig.includes("MATRICULA") && obrig.includes("ART_UNIFICACAO"));
  assert.ok(!obrig.includes("MEMORIAL_DESCRITIVO") && !obrig.includes("PROJETO_APROVADO_PREFEITURA"));
  const opc = docsOpcionais(0, emp);
  assert.ok(opc.includes("MEMORIAL_DESCRITIVO") && !opc.includes("CAPA_IPTU") && !opc.includes("MATRICULA"));
  assert.ok(docsOpcionais(0, emp, ["CAPA_IPTU"]).includes("CAPA_IPTU"), "o que já foi anexado não some");
  assert.ok(!docsOpcionais(0, outro).includes("TERMO_REGULAMENTO_ARQP"), "termo da ARQP não é pedido fora do Quinta");
});

test("documentos criados pela CAPE: exigência, regra de arquivo e exclusão", async () => {
  const { docsObrigatorios, docsOpcionais, infoDoc, ehTipoPadrao } = await import("@/lib/status");
  const { regraDoDestino } = await import("@/lib/upload-destino");
  const doc = (id: string, exigencia: "OBRIGATORIO" | "OPCIONAL" | "OBRIGATORIO_MAIS_LOTES", excluidoEm: Date | null = null) => ({
    id,
    nome: `Doc ${id}`,
    descricao: null,
    extensoes: [".pdf", ".jpg", ".jpeg"],
    maxMB: 12,
    exigencia,
    excluidoEm,
  });
  const emp = { ...outro, documentosPersonalizados: [doc("a", "OBRIGATORIO"), doc("b", "OPCIONAL"), doc("c", "OBRIGATORIO", new Date()), doc("d", "OBRIGATORIO_MAIS_LOTES")] };
  assert.ok(docsObrigatorios(0, emp).includes("p_a"));
  assert.ok(!docsObrigatorios(0, emp).includes("p_c"), "excluído deixa de ser pedido");
  assert.ok(!docsObrigatorios(0, emp).includes("p_d") && docsObrigatorios(1, emp).includes("p_d"));
  assert.ok(docsOpcionais(0, emp).includes("p_b") && !docsOpcionais(0, emp).includes("p_c"));
  assert.ok(docsOpcionais(0, emp, ["p_c"]).includes("p_c"), "o que já foi enviado com ele continua à vista");
  assert.equal(infoDoc("p_a", emp).maxMB, 12);
  assert.equal(infoDoc("p_a", emp).nome, "Doc a");
  assert.ok(!ehTipoPadrao("p_a") && !ehTipoPadrao("PERSONALIZADO") && ehTipoPadrao("MATRICULA"));
  assert.equal(regraDoDestino({ destino: "documento", solicitacaoId: "s", tipo: "p_a", regra: infoDoc("p_a", emp) }).maxBytes, 12 * MB);
  assert.throws(() => regraDoDestino({ destino: "documento", solicitacaoId: "s", tipo: "p_a" }), "sem a regra do banco não há envio");
});

test("termo da ARQP obrigatório só no Quinta da Primavera", async () => {
  const { docsObrigatorios } = await import("@/lib/status");
  assert.ok(docsObrigatorios(0, quinta).includes("TERMO_REGULAMENTO_ARQP"));
  assert.ok(!docsObrigatorios(0, outro).includes("TERMO_REGULAMENTO_ARQP"));
  assert.ok(docsObrigatorios(1, quinta).includes("ART_UNIFICACAO"));
  assert.ok(!docsObrigatorios(0, quinta).includes("ART_UNIFICACAO"));
});

test("declaração da ARQP só no Quinta da Primavera", async () => {
  const { exigeRegulamentoArqp } = await import("@/lib/regulamento-arqp");
  assert.ok(exigeRegulamentoArqp("Quinta da Primavera"));
  assert.ok(exigeRegulamentoArqp(" quinta da primavera "));
  assert.ok(!exigeRegulamentoArqp("Outro Residencial"));
});

test("desvínculo de lote adicional só desfaz o que a aprovação fez", async () => {
  const { rtAposDesvinculo } = await import("@/lib/conferencia-vinculo");
  const base = { rtAlterado: true, rtAnteriorId: null, rtDoLote: "rt", rtDoProjeto: "rt", retirarRt: false, temOutroProjeto: false };
  assert.deepEqual(rtAposDesvinculo(base), { altera: true, rtId: null }, "lote sem RT antes: volta a ficar sem");
  assert.deepEqual(rtAposDesvinculo({ ...base, rtAnteriorId: "outro" }), { altera: true, rtId: "outro" }, "RT substituído volta");
  assert.deepEqual(rtAposDesvinculo({ ...base, rtAlterado: false }), { altera: false }, "RT que já respondia pelo lote fica");
  assert.deepEqual(rtAposDesvinculo({ ...base, temOutroProjeto: true }), { altera: false }, "RT com outro projeto no lote fica");
  assert.deepEqual(rtAposDesvinculo({ ...base, rtDoLote: "terceiro" }), { altera: false }, "lote já passou a outro RT");
  assert.deepEqual(rtAposDesvinculo({ ...base, rtAlterado: null }), { altera: false }, "sem registro: só com decisão explícita");
  assert.deepEqual(rtAposDesvinculo({ ...base, rtAlterado: null, retirarRt: true }), { altera: true, rtId: null });
});

test("lote adicional: mesmo proprietário do lote principal", async () => {
  const { titularidadeEntreLotes } = await import("@/lib/conferencia-vinculo");
  const lote = (titularCpf: string | null, contaCpf?: string) => ({
    titularNome: titularCpf ? "Ana" : null,
    titularCpf,
    proprietario: contaCpf ? { name: "Ana", cpf: contaCpf } : null,
  });
  assert.equal(titularidadeEntreLotes(lote("52998224725"), lote("52998224725")).situacao, "confere");
  assert.equal(titularidadeEntreLotes(lote("52998224725"), lote(null, "529.982.247-25")).situacao, "confere", "CPF da conta vale como referência, com ou sem máscara");
  assert.equal(titularidadeEntreLotes(lote("52998224725"), lote("11144477735")).situacao, "divergente");
  assert.equal(titularidadeEntreLotes(lote("52998224725"), lote(null)).situacao, "sem-referencia", "lote sem dono registrado: confere pela matrícula");
});
