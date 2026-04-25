import React, { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import ClaudeWidget from "./ClaudeWidget";
import Tooltip from "./Tooltip";
import { useUsageData } from "./useUsageData";

export default function App() {
  const { data, refetch } = useUsageData();
  const [showTooltip, setShowTooltip] = useState(false);

  // Track drag state to distinguish click from drag
  const dragRef = useRef({ startX: 0, startY: 0, dragging: false });

  // Listen to events emitted from backend
  useEffect(() => {
    const unlistens = [
      listen("refresh", () => refetch()),
      listen("auth_changed", () => refetch()),
    ];
    return () => {
      unlistens.forEach((p) => p.then((fn) => fn()));
    };
  }, [refetch]);

  // Start drag tracking on mousedown
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, dragging: false };
  }, []);

  // Initiate window drag when mouse moves beyond threshold
  const handleMouseMove = useCallback(async (e: React.MouseEvent) => {
    if (e.buttons !== 1 || dragRef.current.dragging) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    if (dx > 4 || dy > 4) {
      dragRef.current.dragging = true;
      await getCurrentWindow().startDragging();
    }
  }, []);

  // Toggle tooltip on click (skip if drag just ended)
  const handleClick = useCallback(async () => {
    if (dragRef.current.dragging) {
      dragRef.current.dragging = false;
      return;
    }
    setShowTooltip((v) => !v);
    await refetch();
  }, [refetch]);

  const handleRightClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    await invoke("show_context_menu");
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowTooltip(false), 150);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: 80,
        height: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onBlur={handleBlur}
      tabIndex={0}
    >
      <ClaudeWidget pct={data.five_hour_pct} state={data.state} />
      <Tooltip data={data} visible={showTooltip} />
    </div>
  );
}
