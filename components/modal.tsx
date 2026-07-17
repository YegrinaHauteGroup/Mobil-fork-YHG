"use client";

import { useEffect } from "react";

export function Modal({
  title,
  onClose,
  children,
  width = 480,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal panel"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span className="topbar-title">{title}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="panel-body">{children}</div>
      </div>
      <style>{modalCss}</style>
    </div>
  );
}

const modalCss = `
.modal-backdrop {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(4, 6, 8, 0.66);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 80px 20px 20px;
  backdrop-filter: blur(1px);
}
.modal { width: 100%; background: var(--bg-2); }
`;
