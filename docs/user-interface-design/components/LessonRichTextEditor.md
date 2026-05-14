# LessonRichTextEditor — UI Specification

**Source:** `frontend/src/components/LessonRichTextEditor.tsx`
**Type:** Shared Component
**Purpose:** TipTap-based rich text editor for lesson content authoring with formatting toolbar, table editing, image embedding via FileReader, and DOCX import/export utilities.

## Props

| Prop | Type | Default | Description |
| :-- | :--- | :------ | :---------- |
| `value` | `string` | — | HTML content seeded into the editor and synced on external changes. |
| `onChange` | `(html: string) => void` | — | Fires on every TipTap `onUpdate` with the latest HTML. |
| `disabled` | `boolean` | `undefined` | Disables editing and every toolbar button. |
| `compact` | `boolean` | `undefined` | Adds `compact` CSS modifier to the wrapper for tighter layouts. |

## Overview

The component wires TipTap StarterKit with Underline, Highlight, Link (no click-open), TextAlign for `heading`/`paragraph`, Image (block + base64), and Table extensions (row, header, cell, resizable). It mirrors the `value` prop into the editor when external content changes (suppressing the update event to avoid loops) and toggles `editor.setEditable` from the `disabled` prop. The toolbar exposes formatting actions implemented via `editor.chain().focus()...run()` and three side-effect commands: insert link via `window.prompt`, insert image via dynamic `<input type="file">` + FileReader (data URL), and DOCX import using `mammoth.convertToHtml` plus DOCX export using `html-docx-js-typescript`'s `asBlob`. Errors during DOCX import or export surface as `window.alert` dialogs. While DOCX operations run, both DOCX buttons are disabled (`docxBusy`).

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | View | Container | `lesson-rich-editor` wrapper | Applies `compact` and `is-disabled` modifier classes based on props. |
| 2 | View | Container | `lesson-rich-toolbar` | Hosts all formatting buttons. |
| 3 | Click | Button | Undo button | `material-symbols-outlined` glyph "undo"; runs `editor.chain().focus().undo()`. |
| 4 | Click | Button | Redo button | Glyph "redo"; runs `redo()`. |
| 5 | Click | Button | Bold button | Title "In đậm"; toggles bold. |
| 6 | Click | Button | Italic button | Title "In nghiêng"; toggles italic. |
| 7 | Click | Button | Underline button | Title "Gạch chân"; toggles underline. |
| 8 | Click | Button | Heading 2 button | Title "Heading 2"; toggles `heading` level 2. |
| 9 | Click | Button | Bullet list button | Title "Danh sách chấm"; toggles bullet list. |
| 10 | Click | Button | Ordered list button | Title "Danh sách số"; toggles ordered list. |
| 11 | Click | Button | Highlight button | Title "Highlight"; toggles highlight extension. |
| 12 | Click | Button | Align-left button | Title "Canh trái"; `setTextAlign("left")`. |
| 13 | Click | Button | Align-center button | Title "Canh giữa"; `setTextAlign("center")`. |
| 14 | Click | Button | Align-right button | Title "Canh phải"; `setTextAlign("right")`. |
| 15 | Click | Button | Insert-link button | Title "Chèn liên kết"; opens `window.prompt("Nhập URL liên kết:")` then calls `setLink({ href })`. |
| 16 | Click | Button | Remove-link button | Title "Bỏ liên kết"; calls `unsetLink()`. |
| 17 | Click | Button | Insert-image button | Title "Chèn ảnh"; spawns `<input type="file" accept="image/*">`, reads selected file as data URL, inserts via `setImage({ src, alt })`. |
| 18 | Click | Button | Insert-table button | Title "Chèn bảng"; inserts 3×3 table with header row. |
| 19 | Click | Button | Add-column button | Title "Thêm cột"; `addColumnAfter()`. |
| 20 | Click | Button | Delete-column button | Title "Xóa cột"; `deleteColumn()`. |
| 21 | Click | Button | Add-row button | Title "Thêm hàng"; `addRowAfter()`. |
| 22 | Click | Button | Delete-row button | Title "Xóa hàng"; `deleteRow()`. |
| 23 | Click | Button | Merge-cells button | Title "Gộp ô"; `mergeCells()`. |
| 24 | Click | Button | Split-cell button | Title "Tách ô"; `splitCell()`. |
| 25 | Click | Button | Toggle-header-row button | Title "Bật/tắt header"; `toggleHeaderRow()`. |
| 26 | Click | Button | Delete-table button | Title "Xóa bảng"; `deleteTable()`. |
| 27 | Click | Button | Import-DOCX button | Title "Import DOCX"; opens file picker for `.docx`, converts via `mammoth.convertToHtml` and replaces content; alerts "Không thể import DOCX." on failure. Disabled while `docxBusy` or `disabled`. |
| 28 | Click | Button | Export-DOCX button | Title "Export DOCX"; serializes content to a `<!doctype html>` document, converts via `asBlob`, downloads as `lesson-content.docx`; alerts "Không thể export DOCX." on failure. Disabled while `docxBusy` or `disabled`. |
| 29 | View | RichTextEditor | `EditorContent` | TipTap editor surface with class `lesson-rich-content`. |
| 30 | Validation | Behavior | Link prompt cancel | If `window.prompt` returns empty/null, no command is dispatched. |
| 31 | Validation | Behavior | Image file selection | If no file chosen or FileReader yields empty string, the image is not inserted. |
| 32 | Loading | Behavior | DOCX in-flight | `docxBusy` blocks both DOCX buttons during import/export. |

## States & Validation Notes

- When `editor` is null (still mounting) the component renders nothing.
- External `value` updates only call `setContent` if the editor's current HTML differs to avoid feedback loops; `emitUpdate: false` prevents re-firing `onChange`.
- `disabled` propagates to TipTap via `editor.setEditable(!disabled)` and natively disables every toolbar button.
- DOCX export revokes the temporary object URL 800 ms after `a.click()` to allow the browser to start the download.
- The image insertion path uses base64 embedding (`allowBase64: true`), so large images inflate stored HTML.
