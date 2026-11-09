import { z } from "zod";

// Quem responde pela execução: pedido no protocolo ou, se o profissional ainda não estava
// contratado, na liberação da obra. Os campos têm o mesmo nome nos dois formulários.
export const rtExecucaoSchema = z.object({
  rtExecNome: z.string().trim().min(3, "Informe o responsável técnico pela execução"),
  rtExecRegistro: z.string().trim().min(3, "Informe o registro CAU/CREA do responsável técnico pela execução"),
  rtExecEmail: z.string().trim().email("E-mail inválido para o responsável técnico pela execução"),
});
