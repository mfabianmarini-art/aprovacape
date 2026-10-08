import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ondeIdentificador } from "@/lib/identificador-login";

const credentialsSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const MAX_TENTATIVAS_LOGIN = 5;
const BLOQUEIO_LOGIN_MS = 15 * 60 * 1000;
const CONFERE_SESSAO_MS = 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Trusts the incoming Host header — safe here because this app is meant to run
  // behind a single reverse proxy/host you control. If deploying publicly behind
  // multiple untrusted edges, set AUTH_URL instead and remove this.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "E-mail ou CPF" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { identifier, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: ondeIdentificador(identifier),
        });
        if (!user) return null;

        // Bloqueio vigente: nem chega a conferir a senha.
        if (user.bloqueadoAte && user.bloqueadoAte > new Date()) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const tentativas = user.tentativasLogin + 1;
          await prisma.user.update({
            where: { id: user.id },
            data:
              tentativas >= MAX_TENTATIVAS_LOGIN
                ? { tentativasLogin: 0, bloqueadoAte: new Date(Date.now() + BLOQUEIO_LOGIN_MS) }
                : { tentativasLogin: tentativas },
          });
          return null;
        }

        if (user.tentativasLogin > 0 || user.bloqueadoAte) {
          await prisma.user.update({ where: { id: user.id }, data: { tentativasLogin: 0, bloqueadoAte: null } });
        }

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.loginEm = Date.now();
        token.conferidoEm = Date.now();
        return token;
      }
      // Sessão é JWT, sem registro no banco: para a redefinição de senha derrubar quem
      // estava logado, de tempos em tempos confere se a senha mudou depois do login (ou se
      // a conta deixou de existir). O intervalo poupa uma consulta por requisição.
      if (token.uid && Date.now() - (token.conferidoEm ?? 0) > CONFERE_SESSAO_MS) {
        const conta = await prisma.user.findUnique({ where: { id: token.uid }, select: { senhaAlteradaEm: true } });
        if (!conta || (conta.senhaAlteradaEm && conta.senhaAlteradaEm.getTime() > (token.loginEm ?? 0))) return null;
        token.conferidoEm = Date.now();
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.uid) session.user.id = token.uid;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
});
