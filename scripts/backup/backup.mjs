#!/usr/bin/env node
// Backup do CAPE Aprova, fora dos provedores do app (regra 3-2-1): banco e arquivos vão
// para um armazenamento compatível com S3 (Cloudflare R2, AWS S3 sa-east-1, Backblaze…),
// sempre CRIPTOGRAFADOS com a chave pública age — contêm CPF e documentos pessoais. A chave
// privada fica fora do provedor (cofre da CAPE); sem ela os backups são ilegíveis.
//
//   node scripts/backup/backup.mjs chave              gera um par de chaves (guarde a privada!)
//   node scripts/backup/backup.mjs banco              pg_dump → .dump.age (diário; dia 1 também mensal)
//   node scripts/backup/backup.mjs arquivos           cópia incremental do Vercel Blob
//   node scripts/backup/backup.mjs decifrar ENT SAI   decifra um arquivo baixado do backup
//
// Ambiente: DATABASE_URL (conexão direta, sem pooler), BLOB_READ_WRITE_TOKEN,
// BACKUP_AGE_RECIPIENT (chave pública "age1…"), e o destino: BACKUP_S3_BUCKET,
// BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY, BACKUP_S3_ENDPOINT (R2/B2; vazio
// para AWS), BACKUP_S3_REGION — ou BACKUP_DESTINO_LOCAL=/pasta para gravar em disco.
// Decifrar: BACKUP_AGE_IDENTITY (chave privada "AGE-SECRET-KEY-1…").
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { Decrypter, Encrypter, generateX25519Identity, identityToRecipient } from "age-encryption";

const env = (k, obrigatorio = true) => {
  const v = process.env[k];
  if (!v && obrigatorio) throw new Error(`Falta a variável ${k}.`);
  return v ?? "";
};

// Diretório "lixeira": arquivo que sumiu do Blob (excluído após a rescisão, ou upload
// abandonado) ainda fica no backup por este prazo — dá tempo de recuperar uma exclusão
// por engano, e depois some também do backup (LGPD).
const LIXEIRA_DIAS = 30;

// ---------- destino ----------
function rodar(cmd, args, { entrada, saidaBuffer = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: [entrada ? "pipe" : "ignore", "pipe", "pipe"], env: { ...process.env, ...envAws() } });
    const partes = [];
    let erro = "";
    p.stdout.on("data", (d) => saidaBuffer && partes.push(d));
    p.stderr.on("data", (d) => (erro += d));
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve(Buffer.concat(partes)) : reject(Object.assign(new Error(`${cmd} saiu com ${c}: ${erro.slice(0, 500)}`), { codigo: c, erro }))));
    if (entrada) {
      if (entrada instanceof Uint8Array) p.stdin.end(Buffer.from(entrada));
      else Readable.fromWeb(entrada).pipe(p.stdin);
    }
  });
}
function envAws() {
  return {
    AWS_ACCESS_KEY_ID: process.env.BACKUP_S3_ACCESS_KEY_ID ?? "",
    AWS_SECRET_ACCESS_KEY: process.env.BACKUP_S3_SECRET_ACCESS_KEY ?? "",
    AWS_DEFAULT_REGION: process.env.BACKUP_S3_REGION || "auto",
  };
}
const s3 = (chave) => `s3://${env("BACKUP_S3_BUCKET")}/${chave}`;
const endpoint = () => (process.env.BACKUP_S3_ENDPOINT ? ["--endpoint-url", process.env.BACKUP_S3_ENDPOINT] : []);

const local = process.env.BACKUP_DESTINO_LOCAL;
const destino = {
  async gravar(chave, dados) {
    if (local) {
      const f = path.join(local, chave);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      if (dados instanceof Uint8Array) fs.writeFileSync(f, dados);
      else await new Promise((ok, falha) => Readable.fromWeb(dados).pipe(fs.createWriteStream(f)).on("finish", ok).on("error", falha));
      return;
    }
    await rodar("aws", ["s3", "cp", "-", s3(chave), ...endpoint(), "--only-show-errors"], { entrada: dados });
  },
  async ler(chave) {
    if (local) {
      const f = path.join(local, chave);
      return fs.existsSync(f) ? fs.readFileSync(f) : null;
    }
    try {
      return await rodar("aws", ["s3", "cp", s3(chave), "-", ...endpoint(), "--only-show-errors"], { saidaBuffer: true });
    } catch (e) {
      if (/404|NoSuchKey|does not exist|Not Found/i.test(e.erro ?? "")) return null;
      throw e;
    }
  },
  async apagar(chave) {
    if (local) return fs.rmSync(path.join(local, chave), { force: true });
    await rodar("aws", ["s3", "rm", s3(chave), ...endpoint(), "--only-show-errors"]);
  },
};

function cifrador() {
  const e = new Encrypter();
  e.addRecipient(env("BACKUP_AGE_RECIPIENT"));
  return e;
}

// ---------- comandos ----------
async function chave() {
  const id = await generateX25519Identity();
  console.log("Chave PÚBLICA (vai no GitHub como BACKUP_AGE_RECIPIENT):");
  console.log(await identityToRecipient(id));
  console.log("\nChave PRIVADA (guarde fora da internet: cofre de senhas da CAPE + cópia impressa).");
  console.log("Sem ela não há como restaurar nenhum backup:");
  console.log(id);
}

async function banco() {
  const url = env("DATABASE_URL");
  const dump = await rodar("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--dbname", url], { saidaBuffer: true });
  if (dump.length < 1024) throw new Error("pg_dump gerou um arquivo vazio demais — backup abortado.");
  const cifrado = await cifrador().encrypt(new Uint8Array(dump));
  const hoje = new Date().toISOString().slice(0, 10);
  await destino.gravar(`banco/diario/${hoje}.dump.age`, cifrado);
  // Mensal no dia 1: a regra de ciclo de vida do bucket guarda o diário por 30 dias e o
  // mensal por 12 meses (ver README).
  if (hoje.endsWith("-01")) await destino.gravar(`banco/mensal/${hoje.slice(0, 7)}.dump.age`, cifrado);
  console.log(JSON.stringify({ evento: "backup_banco", data: hoje, bytes: dump.length, cifrado: cifrado.length }));
}

async function arquivos() {
  const { list, get } = await import("@vercel/blob");
  env("BLOB_READ_WRITE_TOKEN");
  const bruto = await destino.ler("arquivos/manifesto.json");
  const manifesto = bruto ? JSON.parse(bruto.toString("utf8")) : {};
  const vistos = new Set();
  const r = { total: 0, copiados: 0, bytesCopiados: 0, naLixeira: 0, removidosDaLixeira: 0, falhas: 0 };

  let cursor;
  do {
    const pagina = await list({ cursor, limit: 1000 });
    cursor = pagina.hasMore ? pagina.cursor : undefined;
    for (const b of pagina.blobs) {
      r.total++;
      vistos.add(b.pathname);
      const m = manifesto[b.pathname];
      if (m && !m.sumiuEm) continue;
      if (m?.sumiuEm) { delete m.sumiuEm; continue; } // voltou (improvável): a cópia segue lá
      try {
        // Arquivos do app nunca mudam depois de gravados (caminho único por envio), então
        // a cópia é incremental pelo caminho.
        const res = await get(b.pathname, { access: "private" });
        if (!res || res.statusCode !== 200) throw new Error("não encontrado");
        const cifrado = await cifrador().encrypt(new Uint8Array(await new Response(res.stream).arrayBuffer()));
        await destino.gravar(`arquivos/${b.pathname}.age`, cifrado);
        manifesto[b.pathname] = { tamanho: b.size, copiadoEm: new Date().toISOString() };
        r.copiados++;
        r.bytesCopiados += b.size;
      } catch (e) {
        r.falhas++;
        console.error(`[backup] falha ao copiar ${b.pathname}: ${e.message}`);
      }
    }
  } while (cursor);

  const agora = Date.now();
  for (const [p, m] of Object.entries(manifesto)) {
    if (vistos.has(p)) continue;
    if (!m.sumiuEm) { m.sumiuEm = new Date().toISOString(); r.naLixeira++; continue; }
    if (agora - new Date(m.sumiuEm).getTime() > LIXEIRA_DIAS * 864e5) {
      await destino.apagar(`arquivos/${p}.age`);
      delete manifesto[p];
      r.removidosDaLixeira++;
    }
  }
  await destino.gravar("arquivos/manifesto.json", new TextEncoder().encode(JSON.stringify(manifesto)));
  console.log(JSON.stringify({ evento: "backup_arquivos", ...r }));
  if (r.falhas) process.exitCode = 1;
}

async function decifrar(entrada, saida) {
  const d = new Decrypter();
  d.addIdentity(env("BACKUP_AGE_IDENTITY"));
  fs.writeFileSync(saida, await d.decrypt(new Uint8Array(fs.readFileSync(entrada))));
  console.log(`Decifrado em ${saida}`);
}

const [cmd, ...args] = process.argv.slice(2);
const comandos = { chave, banco, arquivos, decifrar: () => decifrar(args[0], args[1]) };
if (!comandos[cmd]) {
  console.error("Uso: backup.mjs chave | banco | arquivos | decifrar <entrada.age> <saida>");
  process.exit(2);
}
comandos[cmd]().catch((e) => {
  console.error(`[backup] ${e.message}`);
  process.exit(1);
});
