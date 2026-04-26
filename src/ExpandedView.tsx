import { UsageData, WidgetState } from "./useUsageData";
import ClaudeWidget from "./ClaudeWidget";

function formatReset(iso: string | null) {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "곧 리셋";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}시간 ${m}분 후` : `${m}분 후`;
}

function stateLabel(state: WidgetState) {
  switch (state) {
    case "idle":       return { text: "유휴",         color: "#5a5a72" };
    case "active":     return { text: "● 활성",       color: "#2ecc71" };
    case "warning":    return { text: "⚠ 한도 임박",  color: "#f59e0b" };
    case "limit_5h":   return { text: "😴 5h 한도",   color: "#ef4444" };
    case "limit_week": return { text: "💀 주간 초과", color: "#6b7280" };
    case "error":      return { text: "⚠ 오류",       color: "#f87171" };
  }
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 5, background: "#2a2a35", borderRadius: 3, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(pct, 100)}%`,
          background: color,
          borderRadius: 3,
          transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
    </div>
  );
}

export default function ExpandedView({ data, onClose }: { data: UsageData; onClose: () => void }) {
  const label = stateLabel(data.state);
  const fiveColor =
    data.five_hour_pct >= 100 ? "#ef4444" : data.five_hour_pct >= 80 ? "#f59e0b" : "#2ecc71";
  const weekColor =
    data.seven_day_pct >= 100 ? "#ef4444" : data.seven_day_pct >= 80 ? "#f59e0b" : "#2ecc71";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .exp-root {
          width: 360px;
          min-height: 480px;
          background: #0e0e11;
          border-radius: 20px;
          border: 1px solid #1e1e28;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 32px 24px;
          box-sizing: border-box;
          font-family: 'Space Mono', monospace;
          color: #e8e8f0;
          box-shadow: 0 24px 80px rgba(0,0,0,0.8);
          position: relative;
          user-select: none;
        }
        .exp-close {
          position: absolute;
          top: 14px; right: 16px;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #2a2a35;
          border: none;
          color: #5a5a72;
          cursor: pointer;
          font-size: 13px;
          display: flex; align-items: center; justify-content: center;
          line-height: 1;
          padding: 0;
        }
        .exp-close:hover { background: #3a3a50; color: #e8e8f0; }
        .exp-title {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: #5a5a72;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .exp-tokens {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #e8e8f0;
          margin-top: 16px;
          text-align: center;
        }
        .exp-tokens span { font-size: 16px; color: #5a5a72; font-weight: 400; }
        .exp-sub {
          font-size: 11px;
          color: #5a5a72;
          margin-top: 6px;
          letter-spacing: 0.05em;
        }
        .exp-badge {
          margin-top: 14px;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 11px;
          letter-spacing: 0.1em;
          border: 1px solid currentColor;
          opacity: 0.9;
        }
        .exp-divider {
          width: 100%;
          height: 1px;
          background: #1e1e28;
          margin: 20px 0 16px;
        }
        .exp-row { width: 100%; margin-bottom: 14px; }
        .exp-row-head {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #5a5a72;
          margin-bottom: 5px;
          letter-spacing: 0.08em;
        }
        .exp-reset { font-size: 10px; color: #3a3a50; margin-top: 3px; }
      `}</style>

      <div className="exp-root">
        <button className="exp-close" onClick={onClose}>✕</button>
        <div className="exp-title">TOKEN USAGE</div>

        {/* Widget */}
        <ClaudeWidget pct={data.five_hour_pct} state={data.state} />

        {/* Numbers */}
        <div className="exp-tokens">
          {data.tokens_used.toLocaleString()}
          <span> / {data.tokens_max.toLocaleString()}</span>
        </div>
        <div className="exp-sub">5시간 기준 · {data.five_hour_pct}% 사용</div>

        {/* Status badge */}
        <div
          className="exp-badge"
          style={{ color: label.color, borderColor: label.color + "40", background: label.color + "12" }}
        >
          {label.text}
        </div>

        <div className="exp-divider" />

        {/* 5h bar */}
        <div className="exp-row">
          <div className="exp-row-head">
            <span>5시간 세션</span>
            <span style={{ color: fiveColor }}>{data.five_hour_pct}%</span>
          </div>
          <Bar pct={data.five_hour_pct} color={fiveColor} />
          <div className="exp-reset">리셋: {formatReset(data.resets_at_5h)}</div>
        </div>

        {/* 7d bar */}
        <div className="exp-row">
          <div className="exp-row-head">
            <span>주간 한도</span>
            <span style={{ color: weekColor }}>{data.seven_day_pct}%</span>
          </div>
          <Bar pct={data.seven_day_pct} color={weekColor} />
          <div className="exp-reset">리셋: {formatReset(data.resets_at_7d)}</div>
        </div>

        {data.state === "error" && (
          <div style={{ fontSize: 11, color: "#f87171", textAlign: "center", marginTop: 8 }}>
            Claude Code 로그인 후 사용 가능합니다
          </div>
        )}
      </div>
    </>
  );
}
