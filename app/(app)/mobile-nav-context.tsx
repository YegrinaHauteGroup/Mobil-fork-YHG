"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * 모바일(≤640px)에서 아이콘 레일이 슬라이드인 드로어로 바뀔 때 헤더의
 * 햄버거 버튼과 사이드바 사이에서 열림 상태를 공유하기 위한 컨텍스트.
 * 데스크톱/태블릿에서는 레일이 항상 보이므로 이 상태는 참조되지 않는다.
 */
type MobileNavCtx = { open: boolean; toggle: () => void; close: () => void };

const Ctx = createContext<MobileNavCtx | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // 라우트 전환 등으로 데스크톱 폭까지 넓어지면 드로어 상태를 남겨두지 않는다.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 641px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open]);

  return (
    <Ctx.Provider
      value={{
        open,
        toggle: () => setOpen((v) => !v),
        close: () => setOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMobileNav must be used within MobileNavProvider");
  return ctx;
}
