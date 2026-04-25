import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import mammoth from "mammoth";
import { asBlob } from "html-docx-js-typescript";
import "./LessonRichTextEditor.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

export default function LessonRichTextEditor({ value, onChange, disabled, compact }: Props) {
  const [docxBusy, setDocxBusy] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: next }) => onChange(next.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const setLink = () => {
    const href = window.prompt("Nhập URL liên kết:");
    if (!href) return;
    editor.chain().focus().setLink({ href: href.trim() }).run();
  };

  const insertImageFromFile = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        if (!result) return;
        editor.chain().focus().setImage({ src: result, alt: file.name }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const importDocx = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        setDocxBusy(true);
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        editor.commands.setContent(result.value || "<p></p>");
      } catch {
        window.alert("Không thể import DOCX.");
      } finally {
        setDocxBusy(false);
      }
    };
    input.click();
  };

  const exportDocx = async () => {
    try {
      setDocxBusy(true);
      const html = editor.getHTML();
      const fullHtml = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${html}</body></html>`;
      const blob = await asBlob(fullHtml);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lesson-content.docx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 800);
    } catch {
      window.alert("Không thể export DOCX.");
    } finally {
      setDocxBusy(false);
    }
  };

  return (
    <div className={`lesson-rich-editor ${compact ? "compact" : ""} ${disabled ? "is-disabled" : ""}`}>
      <div className="lesson-rich-toolbar">
        <button type="button" title="Undo" aria-label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={disabled}><span className="material-symbols-outlined">undo</span></button>
        <button type="button" title="Redo" aria-label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={disabled}><span className="material-symbols-outlined">redo</span></button>
        <button type="button" title="In đậm" aria-label="In đậm" onClick={() => editor.chain().focus().toggleBold().run()} disabled={disabled}><span className="material-symbols-outlined">format_bold</span></button>
        <button type="button" title="In nghiêng" aria-label="In nghiêng" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={disabled}><span className="material-symbols-outlined">format_italic</span></button>
        <button type="button" title="Gạch chân" aria-label="Gạch chân" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={disabled}><span className="material-symbols-outlined">format_underlined</span></button>
        <button type="button" title="Heading 2" aria-label="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} disabled={disabled}><span className="material-symbols-outlined">format_h2</span></button>
        <button type="button" title="Danh sách chấm" aria-label="Danh sách chấm" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={disabled}><span className="material-symbols-outlined">format_list_bulleted</span></button>
        <button type="button" title="Danh sách số" aria-label="Danh sách số" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={disabled}><span className="material-symbols-outlined">format_list_numbered</span></button>
        <button type="button" title="Highlight" aria-label="Highlight" onClick={() => editor.chain().focus().toggleHighlight().run()} disabled={disabled}><span className="material-symbols-outlined">ink_highlighter</span></button>
        <button type="button" title="Canh trái" aria-label="Canh trái" onClick={() => editor.chain().focus().setTextAlign("left").run()} disabled={disabled}><span className="material-symbols-outlined">format_align_left</span></button>
        <button type="button" title="Canh giữa" aria-label="Canh giữa" onClick={() => editor.chain().focus().setTextAlign("center").run()} disabled={disabled}><span className="material-symbols-outlined">format_align_center</span></button>
        <button type="button" title="Canh phải" aria-label="Canh phải" onClick={() => editor.chain().focus().setTextAlign("right").run()} disabled={disabled}><span className="material-symbols-outlined">format_align_right</span></button>
        <button type="button" title="Chèn liên kết" aria-label="Chèn liên kết" onClick={setLink} disabled={disabled}><span className="material-symbols-outlined">link</span></button>
        <button type="button" title="Bỏ liên kết" aria-label="Bỏ liên kết" onClick={() => editor.chain().focus().unsetLink().run()} disabled={disabled}><span className="material-symbols-outlined">link_off</span></button>
        <button type="button" title="Chèn ảnh" aria-label="Chèn ảnh" onClick={insertImageFromFile} disabled={disabled}><span className="material-symbols-outlined">image</span></button>
        <button
          type="button"
          title="Chèn bảng"
          aria-label="Chèn bảng"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          disabled={disabled}
        >
          <span className="material-symbols-outlined">table</span>
        </button>
        <button type="button" title="Thêm cột" aria-label="Thêm cột" onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={disabled}><span className="material-symbols-outlined">add_column_right</span></button>
        <button type="button" title="Xóa cột" aria-label="Xóa cột" onClick={() => editor.chain().focus().deleteColumn().run()} disabled={disabled}><span className="material-symbols-outlined">view_column_2</span></button>
        <button type="button" title="Thêm hàng" aria-label="Thêm hàng" onClick={() => editor.chain().focus().addRowAfter().run()} disabled={disabled}><span className="material-symbols-outlined">add_row_below</span></button>
        <button type="button" title="Xóa hàng" aria-label="Xóa hàng" onClick={() => editor.chain().focus().deleteRow().run()} disabled={disabled}><span className="material-symbols-outlined">table_rows</span></button>
        <button type="button" title="Gộp ô" aria-label="Gộp ô" onClick={() => editor.chain().focus().mergeCells().run()} disabled={disabled}><span className="material-symbols-outlined">cell_merge</span></button>
        <button type="button" title="Tách ô" aria-label="Tách ô" onClick={() => editor.chain().focus().splitCell().run()} disabled={disabled}><span className="material-symbols-outlined">call_split</span></button>
        <button type="button" title="Bật/tắt header" aria-label="Bật/tắt header" onClick={() => editor.chain().focus().toggleHeaderRow().run()} disabled={disabled}><span className="material-symbols-outlined">table_chart</span></button>
        <button type="button" title="Xóa bảng" aria-label="Xóa bảng" onClick={() => editor.chain().focus().deleteTable().run()} disabled={disabled}><span className="material-symbols-outlined">table_view</span></button>
        <button type="button" title="Import DOCX" aria-label="Import DOCX" onClick={importDocx} disabled={disabled || docxBusy}><span className="material-symbols-outlined">upload_file</span></button>
        <button type="button" title="Export DOCX" aria-label="Export DOCX" onClick={exportDocx} disabled={disabled || docxBusy}><span className="material-symbols-outlined">download</span></button>
      </div>
      <EditorContent editor={editor} className="lesson-rich-content" />
    </div>
  );
}
