"use client";

import { useActionState } from "react";
import { uploadPlantaAction } from "@/lib/actions/empreendimento-actions";

export function PlantaUpload({ empreendimentoId, plantaImageUrl }: { empreendimentoId: string; plantaImageUrl: string | null }) {
  const action = uploadPlantaAction.bind(null, empreendimentoId);
  const [state, formAction, pending] = useActionState(action, null as { error?: string; ok?: boolean } | null);

  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#6B7480" }}>Planta cadastrada</div>
      <div style={{ position: "relative", width: "100%", height: 150, background: "#F4F2ED", borderRadius: 4, overflow: "hidden" }}>
        {plantaImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plantaImageUrl} alt="Planta do empreendimento" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#8B939C", fontSize: 12 }}>Planta do empreendimento</div>
        )}
      </div>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="file"
          name="planta"
          accept="image/*"
          id="planta-file"
          style={{ display: "none" }}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        <label
          htmlFor="planta-file"
          style={{ textAlign: "center", border: "1px solid #DDD8CE", background: "#fff", color: "#12455E", borderRadius: 4, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Enviando…" : "Enviar nova planta"}
        </label>
      </form>
      {state?.error && <div style={{ fontSize: 11.5, color: "#8C2B22" }}>{state.error}</div>}
      <div style={{ fontSize: 11.5, color: "#4A5563", lineHeight: 1.45 }}>
        Após enviar a planta, os lotes são marcados sobre ela e passam a alimentar a tela resumo.
      </div>
    </section>
  );
}
