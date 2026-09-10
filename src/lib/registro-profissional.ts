export const UF_REGEX = /^[A-Z]{2}$/;

// "CREA 5069874/D-SP". A UF é opcional porque cadastros anteriores à separação
// dos campos não a coletavam.
export function formatRegistro(u: { conselho: string | null; registroNumero: string | null; registroUf: string | null }) {
  if (!u.conselho || !u.registroNumero) return null;
  return `${u.conselho} ${u.registroNumero}${u.registroUf ? `-${u.registroUf}` : ""}`;
}
