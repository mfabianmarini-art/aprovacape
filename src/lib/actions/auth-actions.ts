"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { homeForRole } from "@/lib/nav";
import { UF_REGEX } from "@/lib/registro-profissional";
import { cpfValido, digitosCpf } from "@/lib/cpf";
import { ondeIdentificador } from "@/lib/identificador-login";

export type LoginState = { error?: string; redirectTo?: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { identifier, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      // O authorize() recusa sem dizer por quê; sem isto, uma conta bloqueada receberia
      // "senha inválida" e a pessoa seguiria tentando contra o bloqueio.
      const user = await prisma.user.findFirst({ where: ondeIdentificador(identifier) });
      if (user?.bloqueadoAte && user.bloqueadoAte > new Date()) {
        const minutos = Math.max(1, Math.ceil((user.bloqueadoAte.getTime() - Date.now()) / 60000));
        return { error: `Muitas tentativas seguidas. Acesso bloqueado por mais ${minutos} minuto(s) por segurança.` };
      }
      return { error: "E-mail/CPF ou senha inválidos." };
    }
    throw error;
  }

  const user = await prisma.user.findFirst({ where: ondeIdentificador(identifier) });
  return { redirectTo: user ? homeForRole(user.role) : "/login" };
}

const registerSchema = z
  .object({
    tipo: z.enum(["prop", "rt"]),
    nome: z.string().min(3, "Informe o nome completo"),
    cpf: z.string().transform(digitosCpf).refine(cpfValido, "CPF inválido"),
    nascimento: z.string().min(1, "Informe a data de nascimento"),
    telefone: z.string().min(8, "Informe o telefone"),
    email: z.string().email("E-mail inválido"),
    conselho: z.enum(["CREA", "CAU"]).optional(),
    registroNumero: z.string().trim().optional(),
    registroUf: z.string().trim().toUpperCase().optional(),
    senha: z.string().min(8, "Mínimo 8 caracteres"),
    confirmarSenha: z.string(),
    aceite: z.literal("on", { message: "É necessário aceitar os termos" }),
  })
  .refine((d) => d.senha === d.confirmarSenha, { message: "As senhas não coincidem", path: ["confirmarSenha"] })
  .refine((d) => d.tipo !== "rt" || d.conselho, { message: "Selecione o conselho (CREA ou CAU)", path: ["conselho"] })
  .refine((d) => d.tipo !== "rt" || (d.registroNumero && d.registroNumero.length >= 3), {
    message: "Informe o número do registro",
    path: ["registroNumero"],
  })
  .refine((d) => d.tipo !== "rt" || UF_REGEX.test(d.registroUf ?? ""), {
    message: "Informe a UF emissora do registro (ex.: SP)",
    path: ["registroUf"],
  });

export type RegisterState = { error?: string; ok?: boolean; identifier?: string; password?: string } | null;

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const existing = await prisma.user.findFirst({ where: { OR: [{ email: d.email }, { cpf: d.cpf }] } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail ou CPF." };
  }


  const passwordHash = await bcrypt.hash(d.senha, 10);
  await prisma.user.create({
    data: {
      name: d.nome,
      email: d.email,
      cpf: d.cpf,
      birthDate: new Date(d.nascimento),
      phone: d.telefone,
      passwordHash,
      role: d.tipo === "rt" ? "RESPONSAVEL_TECNICO" : "PROPRIETARIO",
      conselho: d.tipo === "rt" ? d.conselho : null,
      registroNumero: d.tipo === "rt" ? d.registroNumero : null,
      registroUf: d.tipo === "rt" ? d.registroUf : null,
    },
  });

  return { ok: true, identifier: d.email, password: d.senha };
}

export async function loginAndRedirectAction(identifier: string, password: string) {
  await signIn("credentials", { identifier, password, redirect: false });
  const user = await prisma.user.findFirst({ where: ondeIdentificador(identifier) });
  return user ? homeForRole(user.role) : "/login";
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
