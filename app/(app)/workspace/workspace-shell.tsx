"use client";

import "./workspace.css";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "./workspace-context";
import { TabBar } from "./tab-bar";
import { PaneView } from "./pane-view";

/**
 * 헤더 아래에 위치하는 작업 영역. 열린 탭이 없거나 숨김 상태이면 현재 라우트의
 * {children} 을 그대로 보여준다(사이드바 탐색은 항상 정상 동작). 탭이 열려
 * 있고 보이는 상태이면 탭 스트립 + 패널 뷰를 렌더링한다.
 *
 * 패널 뷰는 숨김 시 완전히 언마운트한다(CSS display:none 유지가 아님) —
 * CodeMirror/@fortune-sheet/React Flow 는 캔버스·ResizeObserver 기반이라
 * display:none 상태에서 숨겨졌다 다시 보일 때 레이아웃이 깨질 위험이 있다.
 * 다시 열면 서버에서 재조회하므로(자동저장된 내용은 보존됨) 약간의 재조회
 * 지연이 있을 뿐 데이터 유실은 없다.
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { tabs, open } = useWorkspace();
  const router = useRouter();
  const showPanes = tabs.length > 0 && open;

  // 편집기(패널)에서 목록/현재 라우트로 돌아오는 "그 순간"에만 서버 컴포넌트를
  // 한 번 새로고침한다. 자동저장은 revalidatePath 를 호출하지 않으므로(과거의
  // 재조회 폭주 원인이었음), 편집한 제목/내용이 목록에 반영되게 하려면 편집을
  // 마치고 목록으로 나올 때 딱 한 번 갱신해 주면 된다 — 키 입력마다가 아니라
  // 패널→목록 전환 1회. showPanes 가 true→false 로 바뀔 때만 실행한다.
  const prevShowPanes = useRef(showPanes);
  useEffect(() => {
    if (prevShowPanes.current && !showPanes) {
      router.refresh();
    }
    prevShowPanes.current = showPanes;
  }, [showPanes, router]);

  return (
    <div className="wk-shell">
      <TabBar />
      {showPanes ? <PaneView /> : children}
    </div>
  );
}
