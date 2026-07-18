"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "./workspace-context";
import { TabContent } from "./tab-content";
import { useIsMobile } from "@/lib/use-media-query";

export function PaneView() {
  const { tabs, paneLeft, paneRight, split: splitPref, splitPct, setSplitPct, setPaneTab } =
    useWorkspace();
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // 모바일에서는 화면 폭이 두 패널을 나란히 보여주기엔 부족하다(요청사항:
  // 모바일에서 스플릿뷰 미제공). localStorage 에 데스크톱에서 저장된
  // split:true 상태가 남아 있어도 모바일에서는 항상 단일 패널로 강제한다.
  const isMobile = useIsMobile();
  const split = splitPref && !isMobile;

  // Pointer Events — 태블릿(터치 기본 입력)에서도 분할 구분선을 드래그할 수
  // 있도록 마우스/터치를 하나의 이벤트 계열로 처리한다.
  const onDividerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      setSplitPct(((e.clientX - rect.left) / rect.width) * 100);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
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
            onPointerDown={onDividerDown}
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
