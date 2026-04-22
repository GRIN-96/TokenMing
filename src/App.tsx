import React, { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import ClaudeWidget from "./ClaudeWidget";
import Tooltip from "./Tooltip";
import { useUsageData } from "./useUsageData";

export default function App() {
  const { data, refetch } = useUsageData();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = useCallback(async () => {
    setShowTooltip((v) => !v);
    await refetch();
  }, [refetch]);

  const handleRightClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      // Show native context menu via Tauri
      await invoke("show_context_menu");
    },
    []
  );

  // Hide tooltip when clicking outside
  const handleBlur = useCallback(() => {
    setTimeout(() => setShowTooltip(false), 150);
  }, []);

  return (
    <div
      style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onBlur={handleBlur}
      tabIndex={0}
    >
      <ClaudeWidget
        pct={data.five_hour_pct}
        state={data.state}
      />
      <Tooltip data={data} visible={showTooltip} />
    </div>
  );
}
