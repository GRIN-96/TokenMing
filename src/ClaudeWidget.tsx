import { useEffect, useRef } from "react";
import { WidgetState } from "./useUsageData";

interface Props {
  pct: number;          // 0–100
  state: WidgetState;
}

export default function ClaudeWidget({ pct, state }: Props) {
  const fillRef = useRef<SVGGElement>(null);
  const prevPct = useRef(pct);

  // Animate fill on pct change with a little overshoot bounce
  useEffect(() => {
    if (!fillRef.current) return;
    const fillY = 100 - Math.min(pct, 100);
    fillRef.current.style.transition =
      "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
    fillRef.current.style.transform = `translateY(${fillY}%)`;
    prevPct.current = pct;
  }, [pct]);

  // Color config per state
  const colors = {
    idle: { grad1: "#1e1e28", grad2: "#2a2a40", stroke: "rgba(42,42,53,0.8)", glow: "none" },
    active: { grad1: "#1a7a43", grad2: "#2ecc71", stroke: "rgba(46,204,113,0.6)", glow: "0 0 14px rgba(46,204,113,0.5)" },
    warning: { grad1: "#b45309", grad2: "#fcd34d", stroke: "rgba(245,158,11,0.7)", glow: "0 0 14px rgba(245,158,11,0.6)" },
    limit_5h: { grad1: "#7f1d1d", grad2: "#ef4444", stroke: "rgba(239,68,68,0.8)", glow: "0 0 16px rgba(239,68,68,0.7)" },
    limit_week: { grad1: "#111827", grad2: "#374151", stroke: "rgba(75,85,99,0.5)", glow: "none" },
    error: { grad1: "#1e1e28", grad2: "#2a2a40", stroke: "rgba(42,42,53,0.5)", glow: "none" },
  };

  const c = colors[state];
  const isDead = state === "limit_week";
  const isLimit = state === "limit_5h";
  const isWarning = state === "warning";
  const isActive = state === "active";

  // Animation class on widget wrapper
  let wrapperAnim = "";
  if (isActive) wrapperAnim = "bounce";
  if (isWarning) wrapperAnim = "shake";
  if (isDead) wrapperAnim = "fall";

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-3px) rotate(-1deg); }
          40%       { transform: translateX(3px) rotate(1deg); }
          60%       { transform: translateX(-2px); }
          80%       { transform: translateX(2px); }
        }
        @keyframes fall {
          0%   { transform: rotate(0deg) translateY(0); }
          40%  { transform: rotate(-8deg) translateY(-3px); }
          100% { transform: rotate(15deg) translateY(6px); }
        }
        @keyframes waveFlow {
          0%, 100% { d: path("M-10,4 Q2,0 14,4 Q26,8 38,4 Q50,0 62,4 Q74,8 86,4 L86,40 L-10,40 Z"); }
          50%       { d: path("M-10,0 Q2,5 14,0 Q26,-5 38,0 Q50,5 62,0 Q74,-5 86,0 L86,40 L-10,40 Z"); }
        }
        @keyframes waveFlow2 {
          0%, 100% { d: path("M-10,0 Q2,5 14,0 Q26,-5 38,0 Q50,5 62,0 Q74,-5 86,0 L86,40 L-10,40 Z"); }
          50%       { d: path("M-10,4 Q2,0 14,4 Q26,8 38,4 Q50,0 62,4 Q74,8 86,4 L86,40 L-10,40 Z"); }
        }
        @keyframes pulseRing {
          0%   { r: 28px; opacity: 0.6; }
          100% { r: 42px; opacity: 0; }
        }
        .wave1 { animation: waveFlow 2.5s ease-in-out infinite; }
        .wave2 { animation: waveFlow2 2.5s ease-in-out infinite; opacity: 0.4; }
        .pulse { animation: pulseRing 1.4s ease-out infinite; }
        .widget-bounce { animation: bounce 1.8s ease-in-out infinite; }
        .widget-shake  { animation: shake 0.45s ease-in-out infinite; }
        .widget-fall   { animation: fall 0.9s cubic-bezier(0.55,0,1,0.45) forwards; }
      `}</style>

      <svg
        viewBox="0 0 64 64"
        width="72"
        height="72"
        style={{
          filter: `drop-shadow(${c.glow})`,
          cursor: "pointer",
          overflow: "visible",
        }}
        className={
          wrapperAnim === "bounce"
            ? "widget-bounce"
            : wrapperAnim === "shake"
            ? "widget-shake"
            : wrapperAnim === "fall"
            ? "widget-fall"
            : ""
        }
      >
        <defs>
          {/* Claude logo shape — rounded hexagonal blob */}
          <clipPath id="logoClip">
            <path d="M32,3 C32,3 54,9 60,28 C66,47 54,59 32,61 C10,59 -2,47 4,28 C10,9 32,3 32,3 Z" />
          </clipPath>
          <linearGradient id="fillGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={c.grad1} style={{ transition: "stop-color 0.6s" }} />
            <stop offset="100%" stopColor={c.grad2} style={{ transition: "stop-color 0.6s" }} />
          </linearGradient>
        </defs>

        {/* Base shape */}
        <path
          d="M32,3 C32,3 54,9 60,28 C66,47 54,59 32,61 C10,59 -2,47 4,28 C10,9 32,3 32,3 Z"
          fill="#12121a"
          clipPath="url(#logoClip)"
        />

        {/* Liquid fill group */}
        <g clipPath="url(#logoClip)">
          <g ref={fillRef} style={{ transform: "translateY(100%)" }}>
            <rect x="-4" y="-4" width="72" height="72" fill="url(#fillGrad)" />
            {/* Wave on top of fill */}
            {(isActive || isWarning) && (
              <>
                <path className="wave1" fill="rgba(46,204,113,0.3)" />
                <path className="wave2" fill="rgba(26,122,67,0.2)" />
              </>
            )}
          </g>

          {/* Pulse ring: only when actively consuming */}
          {isActive && (
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="rgba(46,204,113,0.3)"
              strokeWidth="2"
              className="pulse"
            />
          )}

          {/* ── EYES ── */}

          {/* Idle: faint ghost eyes */}
          {state === "idle" && (
            <g opacity="0.3">
              <ellipse cx="24" cy="28" rx="2" ry="2.5" fill="#4a4a6a" />
              <ellipse cx="40" cy="28" rx="2" ry="2.5" fill="#4a4a6a" />
            </g>
          )}

          {/* Active: normal cute eyes */}
          {isActive && (
            <g>
              <ellipse cx="24" cy="25" rx="2.5" ry="3" fill="#e8e8f0" />
              <ellipse cx="40" cy="25" rx="2.5" ry="3" fill="#e8e8f0" />
              <ellipse cx="24.6" cy="25.6" rx="1.2" ry="1.5" fill="#1a0a3e" />
              <ellipse cx="40.6" cy="25.6" rx="1.2" ry="1.5" fill="#1a0a3e" />
              <circle cx="25.2" cy="24.8" r="0.5" fill="white" opacity="0.8" />
              <circle cx="41.2" cy="24.8" r="0.5" fill="white" opacity="0.8" />
            </g>
          )}

          {/* Warning: bloodshot eyes */}
          {isWarning && (
            <g>
              <ellipse cx="24" cy="22" rx="2.8" ry="3.2" fill="#ffe4e4" />
              <ellipse cx="40" cy="22" rx="2.8" ry="3.2" fill="#ffe4e4" />
              <ellipse cx="24.6" cy="22.6" rx="1.4" ry="1.7" fill="#7f1d1d" />
              <ellipse cx="40.6" cy="22.6" rx="1.4" ry="1.7" fill="#7f1d1d" />
              {/* stress veins */}
              <line x1="21" y1="18" x2="19" y2="16" stroke="#ef4444" strokeWidth="0.7" opacity="0.7" />
              <line x1="23" y1="17" x2="22" y2="15" stroke="#ef4444" strokeWidth="0.7" opacity="0.5" />
              <line x1="38" y1="17" x2="37" y2="15" stroke="#ef4444" strokeWidth="0.7" opacity="0.5" />
              <line x1="40" y1="18" x2="42" y2="16" stroke="#ef4444" strokeWidth="0.7" opacity="0.7" />
            </g>
          )}

          {/* 5h limit: sleeping eyes + zzz */}
          {isLimit && (
            <g>
              <path d="M21 23 Q24 20 27 23" fill="none" stroke="#fca5a5" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M37 23 Q40 20 43 23" fill="none" stroke="#fca5a5" strokeWidth="1.8" strokeLinecap="round" />
              <text x="44" y="14" fontSize="7" fill="#fca5a5" opacity="0.9" fontFamily="sans-serif">z</text>
              <text x="47" y="10" fontSize="5" fill="#fca5a5" opacity="0.6" fontFamily="sans-serif">z</text>
            </g>
          )}

          {/* Weekly dead: XX eyes + sad mouth */}
          {isDead && (
            <g>
              <line x1="20" y1="20" x2="26" y2="26" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="26" y1="20" x2="20" y2="26" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="36" y1="20" x2="42" y2="26" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="42" y1="20" x2="36" y2="26" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M26 38 Q32 35 38 38" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )}

          {/* Error: question mark eye */}
          {state === "error" && (
            <text x="26" y="34" fontSize="14" fill="#5a5a72" fontFamily="sans-serif" textAnchor="middle">?</text>
          )}
        </g>

        {/* Outline */}
        <path
          d="M32,3 C32,3 54,9 60,28 C66,47 54,59 32,61 C10,59 -2,47 4,28 C10,9 32,3 32,3 Z"
          fill="none"
          stroke={c.stroke}
          strokeWidth="1.2"
          style={{ transition: "stroke 0.5s" }}
        />
      </svg>
    </>
  );
}
