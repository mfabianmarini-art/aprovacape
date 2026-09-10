"use client";

export type Posicao = { x: number; y: number };

// Widget de clique-para-marcar: mostra a planta do empreendimento e converte o clique em
// coordenadas percentuais (0-100), no mesmo sistema usado pelos pins do Resumo do loteamento.
export function PlantaPinPicker({
  plantaImageUrl,
  value,
  onChange,
}: {
  plantaImageUrl: string | null;
  value: Posicao | null;
  onChange: (pos: Posicao) => void;
}) {
  if (!plantaImageUrl) {
    return (
      <div style={{ fontSize: 11.5, color: "#6B7480", fontStyle: "italic" }}>
        Envie a planta do empreendimento (aba ao lado) para posicionar o lote no mapa.
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
        onChange({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
      }}
      title="Clique para marcar a posição do lote"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1200/669",
        background: "#F4F2ED",
        borderRadius: 4,
        overflow: "hidden",
        cursor: "crosshair",
        border: "1px solid #DDD8CE",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={plantaImageUrl}
        alt="Planta do empreendimento"
        style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
      />
      {value && (
        <span
          style={{
            position: "absolute",
            left: `${value.x}%`,
            top: `${value.y}%`,
            transform: "translate(-50%,-50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#B4711A",
            border: "2px solid #fff",
            boxShadow: "0 0 0 2px #B4711A",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
