"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addLoteAction,
  updateLoteAction,
  updateLotePosicaoAction,
  deleteLoteAction,
  type LoteState,
} from "@/lib/actions/lote-actions";
import { EditableField } from "@/components/EditableField";
import { PlantaPinPicker, type Posicao } from "@/components/PlantaPinPicker";
import { TitularLote } from "./TitularLote";

export type LoteCfg = {
  id: string;
  numero: string;
  rua: string | null;
  areaM2: number | null;
  posX: number | null;
  posY: number | null;
  titularNome: string | null;
  titularCpf: string | null;
  titularAtualizadoEm: Date | null;
  proprietarioNome: string | null;
  proprietarioCpf: string | null;
  rtNome: string | null;
  cor: string;
};

const campoStyle: React.CSSProperties = {
  border: "1px solid transparent",
  background: "transparent",
  fontSize: 12.5,
  padding: "4px 6px",
  borderRadius: 3,
  width: "100%",
};

export function LotesManager({
  empreendimentoId,
  quadraId,
  lotes,
  plantaImageUrl,
}: {
  empreendimentoId: string;
  quadraId: string;
  lotes: LoteCfg[];
  plantaImageUrl: string | null;
}) {
  const action = addLoteAction.bind(null, empreendimentoId, quadraId);
  const [state, formAction, pending] = useActionState<LoteState, FormData>(action, null);
  const [novaPos, setNovaPos] = useState<Posicao | null>(null);
  const [reposicionandoId, setReposicionandoId] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 4px 4px" }}>
      {lotes.length === 0 && <div style={{ fontSize: 12, color: "#7A7472" }}>Nenhum lote cadastrado nesta quadra ainda.</div>}
      {lotes.map((l) => {
        const vinculado = !!(l.proprietarioNome || l.rtNome);
        return (
          <div key={l.id} style={{ border: "1px solid #EDE9E1", borderRadius: 4, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 28px", gap: 8, alignItems: "center" }}>
              <EditableField defaultValue={l.numero} onSave={updateLoteAction.bind(null, l.id, "numero")} style={{ ...campoStyle, fontFamily: "var(--font-mono)", fontWeight: 600 }} />
              <span style={{ fontSize: 11.5, color: l.rua ? "#4A5563" : "#8B939C", fontStyle: l.rua ? "normal" : "italic" }}>
                {l.rua ? `${l.rua} · ${l.areaM2?.toLocaleString("pt-BR")} m²` : "sem endereço e área cadastrados"}
              </span>
              <form action={deleteLoteAction.bind(null, l.id)}>
                <button
                  type="submit"
                  disabled={vinculado}
                  title={vinculado ? "Lote com proprietário/RT vinculado não pode ser removido por aqui" : "Remover lote"}
                  style={{
                    border: "1px solid #EDE9E1",
                    background: "#fff",
                    color: vinculado ? "#C9C2B4" : "#8C2B22",
                    borderRadius: 4,
                    padding: "4px 0",
                    fontSize: 13,
                    cursor: vinculado ? "not-allowed" : "pointer",
                    width: "100%",
                  }}
                >
                  ×
                </button>
              </form>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 11, color: "#7A7472" }}>
              <span>
                {l.proprietarioNome ? `Proprietário: ${l.proprietarioNome}` : "sem proprietário"}
                {l.rtNome ? ` · RT: ${l.rtNome}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setReposicionandoId(reposicionandoId === l.id ? null : l.id)}
                style={{ border: 0, background: "transparent", color: "#E01B22", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                {l.posX != null && l.posY != null ? `posição ${l.posX}%, ${l.posY}%` : "sem posição no mapa"} · reposicionar
              </button>
            </div>
            <TitularLote
              loteId={l.id}
              titularNome={l.titularNome}
              titularCpf={l.titularCpf}
              titularAtualizadoEm={l.titularAtualizadoEm}
              proprietarioNome={l.proprietarioNome}
              proprietarioCpf={l.proprietarioCpf}
            />
            {reposicionandoId === l.id && (
              <ReposicionarLote
                loteId={l.id}
                plantaImageUrl={plantaImageUrl}
                inicial={l.posX != null && l.posY != null ? { x: l.posX, y: l.posY } : null}
                onFechar={() => setReposicionandoId(null)}
              />
            )}
          </div>
        );
      })}

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px dashed #C9C2B4", borderRadius: 4, padding: 12 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>Novo lote</div>
        <input name="numero" placeholder="Número" required style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 9px", fontSize: 13, fontFamily: "var(--font-mono)" }} />
        <PlantaPinPicker plantaImageUrl={plantaImageUrl} value={novaPos} onChange={setNovaPos} />
        <input type="hidden" name="posX" value={novaPos?.x ?? ""} />
        <input type="hidden" name="posY" value={novaPos?.y ?? ""} />
        {state?.error && <div style={{ fontSize: 11.5, color: "#8C2B22" }}>{state.error}</div>}
        <button
          type="submit"
          disabled={pending}
          style={{ alignSelf: "flex-start", border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          {pending ? "Adicionando…" : "+ lote"}
        </button>
      </form>
    </div>
  );
}

function ReposicionarLote({
  loteId,
  plantaImageUrl,
  inicial,
  onFechar,
}: {
  loteId: string;
  plantaImageUrl: string | null;
  inicial: Posicao | null;
  onFechar: () => void;
}) {
  const [pos, setPos] = useState<Posicao | null>(inicial);
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <PlantaPinPicker plantaImageUrl={plantaImageUrl} value={pos} onChange={setPos} />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={!pos || pending}
          onClick={() =>
            pos &&
            startTransition(async () => {
              await updateLotePosicaoAction(loteId, pos.x, pos.y);
              onFechar();
            })
          }
          style={{
            border: "1px solid #E01B22",
            background: pos ? "#E01B22" : "#EDE9E1",
            color: pos ? "#fff" : "#8B939C",
            borderRadius: 4,
            padding: "7px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: pos ? "pointer" : "not-allowed",
          }}
        >
          {pending ? "Salvando…" : "Salvar posição"}
        </button>
        <button
          type="button"
          onClick={onFechar}
          style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#7A7472", borderRadius: 4, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}
        >
          cancelar
        </button>
      </div>
    </div>
  );
}
