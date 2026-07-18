"use client";

import { useEffect, useState } from "react";

/** SSR-safe media query hook — false on first render, updates after mount. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Mobile breakpoint used across the app shell (sidebar drawer, split-view lock, etc). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 640px)");
}
