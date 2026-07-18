import Image from "@tiptap/extension-image";

/**
 * 기본 Image 확장에 리사이즈 핸들을 추가한 노드뷰. 코너 드래그로 너비를
 * 조절하고(높이는 자동 비율 유지) 결과를 width 속성(px)으로 저장한다. Tiptap
 * 코어에 리사이즈 가능한 이미지 노드가 없어 바닐라 DOM 노드뷰로 직접 구현.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrap = document.createElement("div");
      wrap.className = "doc-media-wrap";

      const img = document.createElement("img");
      img.className = "doc-media";
      img.src = (node.attrs.src as string) ?? "";
      img.alt = (node.attrs.alt as string) ?? "";
      if (node.attrs.width) img.style.width = `${node.attrs.width}px`;
      wrap.appendChild(img);

      const handle = document.createElement("span");
      handle.className = "doc-media-handle";
      handle.contentEditable = "false";
      wrap.appendChild(handle);

      let startX = 0;
      let startWidth = 0;

      const commitWidth = (width: number) => {
        if (typeof getPos !== "function") return;
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(getPos(), undefined, {
            ...node.attrs,
            width: Math.round(width),
          })
        );
      };

      const onMove = (e: MouseEvent) => {
        const dx = e.clientX - startX;
        const next = Math.max(60, Math.min(920, startWidth + dx));
        img.style.width = `${next}px`;
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        commitWidth(img.getBoundingClientRect().width);
      };
      handle.addEventListener("mousedown", (e) => {
        if (!editor.isEditable) return;
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startWidth = img.getBoundingClientRect().width;
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });

      return {
        dom: wrap,
        selectNode: () => wrap.classList.add("selected"),
        deselectNode: () => wrap.classList.remove("selected"),
        update: (updated) => {
          if (updated.type.name !== "image") return false;
          img.src = (updated.attrs.src as string) ?? "";
          img.style.width = updated.attrs.width ? `${updated.attrs.width}px` : "";
          return true;
        },
      };
    };
  },
});
