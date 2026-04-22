import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export type WidgetState =
  | "idle"       // 0–9%
  | "active"     // 10–79%
  | "warning"    // 80–99%
  | "limit_5h"   // 5h session hit 100%
  | "limit_week" // weekly limit hit
  | "error";     // can't read data

export interface UsageData {
  five_hour_pct: number;   // 0–100
  seven_day_pct: number;   // 0–100
  resets_at_5h: string | null;
  resets_at_7d: string | null;
  state: WidgetState;
  tokens_used: number;
  tokens_max: number;
}

const MAX_TOKENS_MAX5 = 88_000;
const POLL_INTERVAL_MS = 30_000; // 30s

export function useUsageData() {
  const [data, setData] = useState<UsageData>({
    five_hour_pct: 0,
    seven_day_pct: 0,
    resets_at_5h: null,
    resets_at_7d: null,
    state: "idle",
    tokens_used: 0,
    tokens_max: MAX_TOKENS_MAX5,
  });

  const fetchUsage = useCallback(async () => {
    try {
      // Rust backend reads keychain/credentials file and calls the API
      const result = await invoke<{
        five_hour: { utilization: number; resets_at: string | null } | null;
        seven_day: { utilization: number; resets_at: string | null } | null;
      }>("fetch_usage");

      const fivePct = Math.round((result.five_hour?.utilization ?? 0) * 100);
      const sevenPct = Math.round((result.seven_day?.utilization ?? 0) * 100);
      const tokensUsed = Math.round((fivePct / 100) * MAX_TOKENS_MAX5);

      let state: WidgetState;
      if (sevenPct >= 100) {
        state = "limit_week";
      } else if (fivePct >= 100) {
        state = "limit_5h";
      } else if (fivePct >= 80) {
        state = "warning";
      } else if (fivePct >= 10) {
        state = "active";
      } else {
        state = "idle";
      }

      setData({
        five_hour_pct: fivePct,
        seven_day_pct: sevenPct,
        resets_at_5h: result.five_hour?.resets_at ?? null,
        resets_at_7d: result.seven_day?.resets_at ?? null,
        state,
        tokens_used: tokensUsed,
        tokens_max: MAX_TOKENS_MAX5,
      });
    } catch (err) {
      console.error("Failed to fetch usage:", err);
      setData((prev) => ({ ...prev, state: "error" }));
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  return { data, refetch: fetchUsage };
}
