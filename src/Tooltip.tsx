import { UsageData } from "./useUsageData";

interface Props {
  data: UsageData;
  visible: boolean;
}

function formatReset(isoString: string | null): string {
  if (!isoString) return "—";
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return "곧 리셋";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}시간 ${m}분 후`;
  return `${m}분 후`;
}

export default function Tooltip({ data, visible }: Props) {
  if (!visible) return null;

  const fiveBarWidth = Math.min(data.five_hour_pct, 100);
  const weekBarWidth = Math.min(data.seven_day_pct, 100);

  const fiveColor =
    data.five_hour_pct >= 100
      ? "#ef4444"
      : data.five_hour_pct >= 80
      ? "#f59e0b"
      : "#8b5cf6";

  const weekColor =
    data.seven_day_pct >= 100
      ? "#ef4444"
      : data.seven_day_pct >= 80
      ? "#f59e0b"
      : "#6366f1";

  return (
    <>
      <style>{`
        .tooltip {
          position: fixed;
          bottom: 88px;
          right: 8px;
          width: 220px;
          background: #16161a;
          border: 1px solid #2a2a35;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          font-family: 'Space Mono', monospace;
          color: #e8e8f0;
          font-size: 11px;
          z-index: 999;
          animation: tooltipIn 0.15s ease-out;
        }
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .tt-title {
          font-size: 10px;
          letter-spacing: 0.15em;
          color: #5a5a72;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .tt-row { margin-bottom: 10px; }
        .tt-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 10px;
          color: #9a9ab0;
        }
        .tt-bar-bg {
          height: 5px;
          background: #2a2a35;
          border-radius: 3px;
          overflow: hidden;
        }
        .tt-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1);
        }
        .tt-divider {
          height: 1px;
          background: #2a2a35;
          margin: 10px 0;
        }
        .tt-tokens {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #e8e8f0;
        }
        .tt-tokens span { font-size: 10px; color: #5a5a72; font-weight: 400; }
        .tt-reset { font-size: 10px; color: #5a5a72; margin-top: 2px; }
      `}</style>

      <div className="tooltip">
        <div className="tt-title">Claude Code · Max 5x</div>

        <div className="tt-tokens">
          {data.tokens_used.toLocaleString()}
          <span> / {data.tokens_max.toLocaleString()} tok</span>
        </div>

        <div className="tt-divider" />

        {/* 5-hour bar */}
        <div className="tt-row">
          <div className="tt-label">
            <span>5시간 세션</span>
            <span style={{ color: fiveColor }}>{data.five_hour_pct}%</span>
          </div>
          <div className="tt-bar-bg">
            <div
              className="tt-bar-fill"
              style={{ width: `${fiveBarWidth}%`, background: fiveColor }}
            />
          </div>
          <div className="tt-reset">리셋: {formatReset(data.resets_at_5h)}</div>
        </div>

        {/* Weekly bar */}
        <div className="tt-row">
          <div className="tt-label">
            <span>주간 한도</span>
            <span style={{ color: weekColor }}>{data.seven_day_pct}%</span>
          </div>
          <div className="tt-bar-bg">
            <div
              className="tt-bar-fill"
              style={{ width: `${weekBarWidth}%`, background: weekColor }}
            />
          </div>
          <div className="tt-reset">리셋: {formatReset(data.resets_at_7d)}</div>
        </div>

        {/* Status message */}
        {data.state === "limit_week" && (
          <div style={{ color: "#9ca3af", fontSize: "10px", textAlign: "center", marginTop: 4 }}>
            💀 주간 한도 초과 — 리셋 대기 중
          </div>
        )}
        {data.state === "limit_5h" && (
          <div style={{ color: "#fca5a5", fontSize: "10px", textAlign: "center", marginTop: 4 }}>
            😴 5시간 세션 한도 도달
          </div>
        )}
        {data.state === "error" && (
          <div style={{ color: "#f87171", fontSize: "10px", textAlign: "center", marginTop: 4 }}>
            ⚠ Claude Code 로그인 필요
          </div>
        )}
      </div>
    </>
  );
}
