import { useEffect, useState } from "react";
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
    case "idle":       return { text: "IDLE",          color: "#5a5a72" };
    case "active":     return { text: "● 활성",        color: "#2ecc71" };
    case "warning":    return { text: "⚠ 한도 임박",   color: "#f59e0b" };
    case "limit_5h":   return { text: "😴 5h 한도",    color: "#ef4444" };
    case "limit_week": return { text: "💀 주간 초과",  color: "#6b7280" };
    case "error":      return { text: "⚠ 오류",        color: "#f87171" };
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

export default function ExpandedView({
  data,
  onClose,
  onRefresh,
}: {
  data: UsageData;
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const label = stateLabel(data.state);
  const fiveColor =
    data.five_hour_pct >= 100 ? "#ef4444" : data.five_hour_pct >= 80 ? "#f59e0b" : "#2ecc71";
  const weekColor =
    data.seven_day_pct >= 100 ? "#ef4444" : data.seven_day_pct >= 80 ? "#f59e0b" : "#2ecc71";

  const [lastUpdate, setLastUpdate] = useState("—");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (data.state !== "error") {
      setLastUpdate(new Date().toLocaleTimeString("ko-KR"));
    }
  }, [data]);

  async function handleRefresh() {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  const isLive = data.state !== "error";

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
        .exp-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .exp-conn-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          transition: background 0.3s;
        }
        .exp-conn-label {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .exp-pct {
          font-size: 40px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #e8e8f0;
          margin-top: 14px;
          text-align: center;
          line-height: 1;
        }
        .exp-pct span { font-size: 18px; color: #5a5a72; font-weight: 400; }
        .exp-sub {
          font-size: 10px;
          color: #5a5a72;
          margin-top: 6px;
          letter-spacing: 0.08em;
          text-align: center;
        }
        .exp-badge {
          margin-top: 12px;
          padding: 5px 16px;
          border-radius: 20px;
          font-size: 11px;
          letter-spacing: 0.1em;
          border: 1px solid currentColor;
          opacity: 0.9;
          transition: all 0.3s;
        }
        .exp-divider {
          width: 100%;
          height: 1px;
          background: #1e1e28;
          margin: 18px 0 14px;
        }
        .exp-row { width: 100%; margin-bottom: 12px; }
        .exp-row-head {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #5a5a72;
          margin-bottom: 5px;
          letter-spacing: 0.08em;
        }
        .exp-reset { font-size: 10px; color: #2a2a3a; margin-top: 3px; }
        .exp-footer {
          margin-top: 8px;
          font-size: 10px;
          color: #2a2a3a;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .exp-refresh {
          background: none;
          border: 1px solid #1e1e28;
          color: #5a5a72;
          border-radius: 6px;
          padding: 3px 10px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .exp-refresh:hover { border-color: #2ecc71; color: #2ecc71; }
        .exp-refresh:disabled { opacity: 0.4; cursor: default; }
      `}</style>

      <div className="exp-root">
        <button className="exp-close" onClick={onClose}>✕</button>

        <div className="exp-header">
          <div
            className="exp-conn-dot"
            style={{
              background: isLive ? "#2ecc71" : "#ef4444",
              boxShadow: isLive ? "0 0 5px #2ecc71" : "none",
            }}
          />
          <span
            className="exp-conn-label"
            style={{ color: isLive ? "#5a5a72" : "#ef4444" }}
          >
            {isLive ? "LIVE" : "연결 실패"}
          </span>
        </div>

        <ClaudeWidget pct={data.five_hour_pct} state={data.state} />

        <div className="exp-pct">
          {data.state === "error" ? "—" : data.five_hour_pct}
          <span>%</span>
        </div>
        <div className="exp-sub">5시간 세션 사용률</div>

        <div
          className="exp-badge"
          style={{ color: label.color, borderColor: label.color + "40", background: label.color + "12" }}
        >
          {label.text}
        </div>

        <div className="exp-divider" />

        <div className="exp-row">
          <div className="exp-row-head">
            <span>5시간 세션</span>
            <span style={{ color: fiveColor }}>{data.five_hour_pct}%</span>
          </div>
          <Bar pct={data.five_hour_pct} color={fiveColor} />
          <div className="exp-reset">리셋: {formatReset(data.resets_at_5h)}</div>
        </div>

        <div className="exp-row">
          <div className="exp-row-head">
            <span>주간 한도</span>
            <span style={{ color: weekColor }}>{data.seven_day_pct}%</span>
          </div>
          <Bar pct={data.seven_day_pct} color={weekColor} />
          <div className="exp-reset">리셋: {formatReset(data.resets_at_7d)}</div>
        </div>

        {data.state === "error" && (
          <div style={{ fontSize: 11, color: "#f87171", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
            Claude Code 로그인 후 사용 가능합니다
          </div>
        )}

        <div className="exp-footer">
          <span>업데이트: {lastUpdate}</span>
          {onRefresh && (
            <button
              className="exp-refresh"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "…" : "새로고침"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
