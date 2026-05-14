# PrerequisiteGraph — UI Specification

**Source:** `frontend/src/components/PrerequisiteGraph.tsx`
**Type:** Shared Component
**Purpose:** SVG visualization that lays out a course's prerequisite graph in columns by ancestor/descendant distance, draws bezier edges between nodes and highlights the current course plus optional per-node completion status.

## Props

| Prop | Type | Default | Description |
| :-- | :--- | :------ | :---------- |
| `data` | `PrerequisiteGraphData \| null` | — | Source graph (nodes, edges, root id). |
| `onOpenCourse` | `(slug: string) => void` | `undefined` | Callback invoked on node click when a slug is present. |
| `showCompletionStatus` | `boolean` | `true` | Toggles the per-node completion status line; also enlarges node height when true. |

## Overview

`useMemo` builds a layered layout: BFS over the reverse graph from the root yields ancestor levels (negative column indices), BFS over the forward graph yields descendant levels (positive indices). Nodes within the same level are sorted with the current course pushed to the top, then alphabetically (`vi` locale). Position math uses fixed `nodeW=210`, `nodeH=70|52`, `colGap=90`, `rowGap=26`. Edges render as cubic bezier paths from the right edge of the source rectangle to the left edge of the target. Each node renders an SVG `<g>` group that triggers `onOpenCourse(slug)` on click and accepts a `isCurrent` style hook.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1 | Empty | Container | `prereqGraph__empty` | Rendered when `data` is null/empty or layout cannot be built; reads "Chưa có sơ đồ tiên quyết.". |
| 2 | View | Container | `prereqGraphDiagram` wrapper | Hosts the SVG canvas. |
| 3 | View | Graph/Canvas | `prereqGraphDiagram__svg` | SVG sized via computed `width`/`height` and `viewBox`. |
| 4 | View | Container | `prereqGraphDiagram__edge` | Cubic bezier path (`M x1 y1 C cx1 y1, cx2 y2, x2 y2`) per edge in `data.edges`. |
| 5 | View | Container | `prereqGraphDiagram__nodeGroup` | `<g>` wrapping each node; toggles `isCurrent` class when `node.is_current` is true. |
| 6 | Click | Container | Node group | Calls `onOpenCourse(node.slug)` if both `onOpenCourse` and `node.slug` are truthy; otherwise no-op. |
| 7 | View | Container | `prereqGraphDiagram__nodeRect` | Rounded SVG rect for the node body (`rx={12}`). |
| 8 | View | Text | `prereqGraphDiagram__nodeTitle` | Title text truncated to 30 chars with ellipsis "..." appended when longer. |
| 9 | View | Text | `prereqGraphDiagram__nodeStatus` | Visible only when `showCompletionStatus` is true; reads "✓ Hoàn thành" (class `done`) or "• Chưa hoàn thành" (class `pending`). |

## States & Validation Notes

- Layout returns `null` when `data?.nodes?.length` is falsy, triggering the empty state.
- Nodes unreachable from the root in either direction default to `level=0` so they cluster with the root column.
- Title truncation is purely visual (`slice(0, 30) + "..."`); the underlying tooltip is not provided.
- Click handler is wired only when `onOpenCourse` exists; when missing, nodes are still rendered but inert.
- Edges referencing missing endpoints are skipped via `if (!from || !to) return null`.
