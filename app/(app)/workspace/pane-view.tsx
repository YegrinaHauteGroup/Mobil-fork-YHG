"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "./workspace-context";
import { TabContent } from "./tab-content";

export function PaneView() {
  const { tabs, paneLeft, paneRight, split, splitPct, setSplitPct, setPaneTab } =
    useWorkspace();
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      setSplitPct(((e.clientX - rect.left) / rect.width) * 100);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, setSplitPct]);

  const leftTab = tabs.find((t) => t.id === paneLeft);
  const rightTab = tabs.find((t) => t.id === paneRight);

  return (
    <div className="wk-panes" ref={containerRef}>
      <div
        className="wk-pane"
        style={{ flex: split ? `0 0 ${splitPct}%` : "1 1 auto" }}
      >
        {split && (
          <div className="wk-pane-head">
            <select
              className="wk-pane-select"
              value={paneLeft ?? ""}
              onChange={(e) => setPaneTab("left", e.target.value || null)}
            >
              <option value="">— empty —</option>
              {tabs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}
        {leftTab ? (
          <TabContent key={leftTab.id} kind={leftTab.kind} itemId={leftTab.itemId} />
        ) : (
          <div className="wk-pane-empty">No tab open</div>
        )}
      </div>

      {split && (
        <>
          <div
            className={`wk-divider ${dragging ? "dragging" : ""}`}
            onMouseDown={onDividerDown}
          />
          <div className="wk-pane" style={{ flex: "1 1 auto" }}>
            <div className="wk-pane-head">
              <select
                className="wk-pane-select"
                value={paneRight ?? ""}
                onChange={(e) => setPaneTab("right", e.target.value || null)}
              >
                <option value="">— select a tab to compare —</option>
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            {rightTab ? (
              <TabContent key={rightTab.id} kind={rightTab.kind} itemId={rightTab.itemId} />
            ) : (
              <div className="wk-pane-empty">Open another tab to compare</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
