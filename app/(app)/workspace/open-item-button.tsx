"use client";

import { useWorkspace, type TabKind } from "./workspace-context";

export function OpenItemButton({
  kind,
  id,
  title,
  className,
  children,
}: {
  kind: TabKind;
  id: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { openTab } = useWorkspace();
  return (
    <button type="button" className={className} onClick={() => openTab(kind, id, title)}>
      {children}
    </button>
  );
}
