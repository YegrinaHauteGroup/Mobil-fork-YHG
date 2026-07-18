"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { Editor, Range } from "@tiptap/core";

export type SlashItem = {
  title: string;
  desc: string;
  icon: string;
  run: (editor: Editor, range: Range) => void;
};

export type SlashMenuRef = {
  onKeyDown: (e: { event: KeyboardEvent }) => boolean;
};

export const SlashMenu = forwardRef<
  SlashMenuRef,
  { items: SlashItem[]; command: (item: SlashItem) => void }
>(function SlashMenu({ items, command }, ref) {
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter") {
        if (items[index]) command(items[index]);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="slash-menu">
        <div className="slash-empty">No matching blocks</div>
      </div>
    );
  }

  return (
    <div className="slash-menu">
      {items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          className={`slash-item ${i === index ? "active" : ""}`}
          onMouseEnter={() => setIndex(i)}
          onClick={() => command(item)}
        >
          <span className="slash-item-icon">{item.icon}</span>
          <span className="slash-item-text">
            <span className="slash-item-title">{item.title}</span>
            <span className="slash-item-desc">{item.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
});
