"use client";

import { useCallback, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your note…",
  className = "",
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-forest underline decoration-sage-dark/50",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-note min-h-[140px] max-h-[280px] overflow-y-auto scroll-thin px-3 py-2.5 outline-none text-sm text-forest",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  // Sync external value resets (create vs edit)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className={`rounded-xl border border-forest/10 bg-white ${className}`}>
        <div className="h-10 border-b border-forest/5 bg-cream-soft/80" />
        <div className="min-h-[140px] px-3 py-2.5 text-sm text-forest/40">
          Loading editor…
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-forest/10 bg-white overflow-hidden focus-within:border-sage focus-within:ring-2 focus-within:ring-sage/30 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1.5 border-b border-forest/5 bg-cream-soft/90">
        <ToolBtn
          label="Undo"
          active={false}
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </ToolBtn>
        <ToolBtn
          label="Redo"
          active={false}
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </ToolBtn>
        <Sep />
        <ToolBtn
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </ToolBtn>
        <ToolBtn
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolBtn>
        <Sep />
        <ToolBtn
          label="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolBtn>
        <ToolBtn
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolBtn>
        <ToolBtn
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolBtn>
        <Sep />
        <ToolBtn
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •≡
        </ToolBtn>
        <ToolBtn
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolBtn>
        <Sep />
        <ToolBtn label="Link" active={editor.isActive("link")} onClick={setLink}>
          🔗
        </ToolBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function Sep() {
  return <span className="w-px h-5 bg-forest/10 mx-1" aria-hidden />;
}

function ToolBtn({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-sage-light text-forest"
          : "text-forest/70 hover:bg-sage-muted/70"
      } disabled:opacity-30 disabled:pointer-events-none`}
    >
      {children}
    </button>
  );
}
