"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback } from "react";

type Props = {
  /** Used on mount / when `key` remounts after save. */
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  /** Insert description metatags at the cursor (meeting description only). */
  metatagInsertButtons?: boolean;
  /** Shorter editor area for table / inline rows. */
  compact?: boolean;
};

export function MeetingRichTextEditor({
  initialHtml,
  onHtmlChange,
  metatagInsertButtons = false,
  compact = false,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: initialHtml || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `focus:outline-none ${compact ? "min-h-[8rem]" : "min-h-[14rem]"} leading-relaxed [&_p]:mb-4 [&_p]:mt-0 [&_p:first-child]:mt-0 [&_p.vdv-blank-line]:my-6 [&_p.vdv-blank-line]:block [&_p.vdv-blank-line]:min-h-[1.35em] [&_br]:mb-4 [&_br]:block [&_a]:text-teal-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onHtmlChange(ed.getHTML());
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    const t = url.trim();
    if (t === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: t }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={`rounded border border-slate-600 bg-slate-950 ${compact ? "min-h-[8rem]" : "min-h-[14rem]"}`}
        aria-hidden
      />
    );
  }

  const insertMetatag = (token: string) => {
    editor.chain().focus().insertContent(token).run();
  };

  return (
    <div className="meeting-rich-text space-y-2">
      <div className="flex flex-wrap gap-1 border-b border-slate-600 pb-2">
        <button
          type="button"
          className={`rounded px-2 py-1 text-sm ${editor.isActive("bold") ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-200"}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Vet
        </button>
        <button
          type="button"
          className={`rounded px-2 py-1 text-sm ${editor.isActive("italic") ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-200"}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Cursief
        </button>
        <button
          type="button"
          className={`rounded px-2 py-1 text-sm ${editor.isActive("link") ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-200"}`}
          onClick={setLink}
        >
          Link
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-sm bg-slate-800 text-slate-200"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Lijst
        </button>
        {metatagInsertButtons ? (
          <>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm bg-slate-800 text-amber-100/90"
              onClick={() => insertMetatag("{date}")}
              title="Voegt de meetupdatum in (Nederlands, zonder jaar als het dit jaar is)"
            >
              {"{date}"}
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm bg-slate-800 text-amber-100/90"
              onClick={() => insertMetatag("{program}")}
              title="Voegt alle programmaregels in (tijd + opmaak per regel)"
            >
              {"{program}"}
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm bg-slate-800 text-amber-100/90"
              onClick={() => insertMetatag("{programlink}")}
              title="Link naar de openbare evenementpagina (vierdevrijdag.org/event?meet=…)"
            >
              {"{programlink}"}
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm bg-slate-800 text-amber-100/90"
              onClick={() => insertMetatag("{location}")}
              title="Vervangen door de inhoud van het veld Locatie (venue_line)"
            >
              {"{location}"}
            </button>
          </>
        ) : null}
      </div>
      <div className="rounded border border-slate-600 bg-slate-950 px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
