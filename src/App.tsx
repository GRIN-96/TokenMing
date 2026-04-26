import React, { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { listen } from "@tauri-apps/api/event";
import ClaudeWidget from "./ClaudeWidget";
import BarView from "./BarView";
import ExpandedView from "./ExpandedView";
import { useUsageData } from "./useUsageData";

type DisplayMode = "minimal" | "bar";

const MODE_SIZES: Record<DisplayMode, [number, number]> = {
  minimal: [80, 80],
  bar: [280, 52],
};
const EXPANDED_SIZE: [number, number] = [360, 480];

async function resizeWindow(w: number, h: number) {
  await getCurrentWindow().setSize(new LogicalSize(w, h));
}

export default function App() {
  const { data, refetch } = useUsageData();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    return (localStorage.getItem("displayMode") as DisplayMode) ?? "minimal";
  });
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, dragging: false });

  // Resize window whenever mode or expanded state changes
  useEffect(() => {
    if (expanded) {
      resizeWindow(...EXPANDED_SIZE);
    } else {
      resizeWindow(...MODE_SIZES[displayMode]);
    }
  }, [displayMode, expanded]);

  // Listen to backend events
  useEffect(() => {
    const unlistens = [
      listen("refresh", () => refetch()),
      listen("auth_changed", () => { refetch(); }),
      listen<string>("mode_changed", (e) => {
        const mode = e.payload as DisplayMode;
        setDisplayMode(mode);
        localStorage.setItem("displayMode", mode);
        setExpanded(false);
      }),
    ];
    return () => { unlistens.forEach((p) => p.then((fn) => fn())); };
  }, [refetch]);

  // Drag handlers (only in non-expanded mode)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || expanded) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, dragging: false };
  }, [expanded]);

  const handleMouseMove = useCallback(async (e: React.MouseEvent) => {
    if (e.buttons !== 1 || dragRef.current.dragging || expanded) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    if (dx > 4 || dy > 4) {
      dragRef.current.dragging = true;
      await getCurrentWindow().startDragging();
    }
  }, [expanded]);

  const handleClick = useCallback(async () => {
    if (dragRef.current.dragging) { dragRef.current.dragging = false; return; }
    if (!expanded) await refetch();
    setExpanded((v) => !v);
  }, [expanded, refetch]);

  const handleRightClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (expanded) return;
    await invoke("show_context_menu", { currentMode: displayMode });
  }, [expanded, displayMode]);

  const handleBlur = useCallback(() => {
    // Don't auto-close expanded view on blur
  }, []);

  if (expanded) {
    return (
      <div
        style={{ width: 360, height: 480, display: "flex", alignItems: "flex-start", justifyContent: "flex-start" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <ExpandedView data={data} onClose={() => setExpanded(false)} onRefresh={refetch} />
      </div>
    );
  }

  if (displayMode === "bar") {
    return (
      <div
        style={{ width: 280, height: 52 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        <BarView data={data} />
      </div>
    );
  }

  // minimal mode
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
    </div>
  );
}
