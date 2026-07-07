import { formatearSoles } from "../utils/reportes";

const formatEje = (valor) => {
  if (valor >= 1000) {
    return `S/${(valor / 1000).toFixed(valor >= 10000 ? 0 : 1)}k`;
  }
  return `S/${Math.round(valor)}`;
};

export default function GraficoIngresosSemanales({ datos }) {
  const totalSemana = datos.reduce((acc, d) => acc + d.monto, 0);

  const maxMonto = Math.max(...datos.map((d) => d.monto), 1);
  const escalaMax = maxMonto * 1.15;

  const altura = 280;
  const ancho = 640;

  const pad = {
    top: 28,
    right: 22,
    bottom: 62,
    left: 62,
  };

  const chartW = ancho - pad.left - pad.right;
  const chartH = altura - pad.top - pad.bottom;

  const barGap = 20;
  const barW = Math.min(
    52,
    (chartW - barGap * (datos.length - 1)) / datos.length
  );

  const groupW = chartW / datos.length;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.top + chartH - t * chartH,
    valor: escalaMax * t,
  }));

  const barras = datos.map((d, i) => {
    const x = pad.left + i * groupW + groupW / 2;

    const barH =
      escalaMax > 0
        ? (d.monto / escalaMax) * chartH
        : 0;

    const y = pad.top + chartH - barH;

    return {
      ...d,
      x,
      y,
      barH,
      barX: x - barW / 2,
    };
  });

  const sinDatos = datos.every((d) => d.monto === 0);

  return (
    <div className="px-5 pb-5 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">
          Ingresos registrados durante la semana
        </p>

        <p className="text-xs text-slate-400">
          Total:{" "}
          <span className="font-bold text-[#11B9BB]">
            {formatearSoles(totalSemana)}
          </span>
        </p>
      </div>

      {sinDatos ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-sm text-slate-400">
            Sin ingresos registrados esta semana
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${ancho} ${altura}`}
            className="w-full min-w-[480px]"
            role="img"
            aria-label="Gráfico de ingresos semanales"
          >
            {/* Líneas del eje */}
            {ticks.map((tick) => (
              <g key={tick.valor}>
                <line
                  x1={pad.left}
                  y1={tick.y}
                  x2={pad.left + chartW}
                  y2={tick.y}
                  stroke="#e2e8f0"
                  strokeDasharray={tick.valor === 0 ? "0" : "4 4"}
                />

                <text
                  x={pad.left - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px]"
                >
                  {formatEje(tick.valor)}
                </text>
              </g>
            ))}

            {/* Barras */}
            {barras.map((b) => (
              <g key={b.dia}>
                <rect
                  x={b.barX}
                  y={b.y}
                  width={barW}
                  height={Math.max(b.barH, 0)}
                  rx="10"
                  fill="url(#gradBar)"
                >
                  <title>
                    {`${b.dia}: ${formatearSoles(b.monto)}`}
                  </title>
                </rect>

                {/* Día */}
                <text
                  x={b.x}
                  y={pad.top + chartH + 18}
                  textAnchor="middle"
                  className="fill-slate-600 text-[11px] font-bold"
                >
                  {b.dia}
                </text>

                {/* Monto */}
                <text
                  x={b.x}
                  y={pad.top + chartH + 34}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px]"
                >
                  {formatearSoles(b.monto)}
                </text>
              </g>
            ))}

            <defs>
              <linearGradient
                id="gradBar"
                x1="0"
                y1="1"
                x2="0"
                y2="0"
              >
                <stop offset="0%" stopColor="#0d8f91" />
                <stop offset="100%" stopColor="#11B9BB" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
}