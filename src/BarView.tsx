import { UsageData, WidgetState } from "./useUsageData";

function formatReset(iso: string | null) {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "곧 리셋";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m 후` : `${m}분 후`;
}

function stateColor(state: WidgetState) {
  if (state === "warning") return "#f59e0b";
  if (state === "limit_5h") return "#ef4444";
  if (state === "limit_week") return "#6b7280";
  if (state === "error") return "#5a5a72";
  if (state === "idle") return "#3a3a50";
  return "#2ecc71";
}

export default function BarView({ data }: { data: UsageData }) {
  const color = stateColor(data.state);
  const fillPct = Math.min(data.five_hour_pct, 100);
  const fillY = 32 - (32 * fillPct) / 100;

  return (
    <div
      style={{
        width: 280,
        height: 52,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 12,
        background: "rgba(14, 14, 17, 0.92)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.07)",
        boxSizing: "border-box",
        userSelect: "none",
        cursor: "pointer",
      }}
    >
      {/* Mini blob */}
      <svg viewBox="0 0 32 32" width={30} height={30} style={{ flexShrink: 0, overflow: "visible" }}>
        <defs>
          <clipPath id="barClip">
            <path d="M16,2 C16,2 27,5 30,14 C33,23 27,29 16,30 C5,29 -1,23 2,14 C5,5 16,2 16,2 Z" />
          </clipPath>
          <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.7} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path
          d="M16,2 C16,2 27,5 30,14 C33,23 27,29 16,30 C5,29 -1,23 2,14 C5,5 16,2 16,2 Z"
          fill="#12121a"
        />
        <g clipPath="url(#barClip)">
          <rect x="-2" y={fillY - 2} width="36" height="36" fill="url(#barGrad)" />
        </g>
        <path
          d="M16,2 C16,2 27,5 30,14 C33,23 27,29 16,30 C5,29 -1,23 2,14 C5,5 16,2 16,2 Z"
          fill="none"
          stroke={color}
          strokeWidth={0.8}
          strokeOpacity={0.5}
        />
      </svg>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#e8e8f0",
            fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            lineHeight: 1.3,
          }}
        >
          Claude Code
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#9a9ab0",
            fontFamily: "monospace",
            lineHeight: 1.3,
            marginTop: 1,
          }}
        >
          {data.state === "error"
            ? "로그인 필요"
            : data.state === "limit_week"
            ? "주간 한도 초과"
            : data.state === "limit_5h"
            ? "5h 한도 도달"
            : `${data.five_hour_pct}% · 리셋 ${formatReset(data.resets_at_5h)}`}
        </div>
      </div>

      {/* Status dot */}
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${color}80`,
        }}
      />
    </div>
  );
}
