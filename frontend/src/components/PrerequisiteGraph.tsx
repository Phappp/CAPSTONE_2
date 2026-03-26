import { useMemo } from "react";
import "./PrerequisiteGraph.css";

export type PrerequisiteGraphNode = {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  level: string;
  is_current: boolean;
  is_completed: boolean;
};

export type PrerequisiteGraphEdge = {
  from_course_id: number;
  to_course_id: number;
};

export type PrerequisiteGraphData = {
  root_course_id: number;
  nodes: PrerequisiteGraphNode[];
  edges: PrerequisiteGraphEdge[];
};

type Props = {
  data: PrerequisiteGraphData | null;
  onOpenCourse?: (slug: string) => void;
  showCompletionStatus?: boolean;
};

export default function PrerequisiteGraph({ data, onOpenCourse, showCompletionStatus = true }: Props) {
  const layout = useMemo(() => {
    if (!data?.nodes?.length) return null;
    const rootId = data.root_course_id;
    const byId = new Map<number, PrerequisiteGraphNode>();
    for (const n of data.nodes) byId.set(n.id, n);
    const incoming = new Map<number, number[]>();
    const outgoing = new Map<number, number[]>();
    for (const e of data.edges || []) {
      const inc = incoming.get(e.to_course_id) || [];
      inc.push(e.from_course_id);
      incoming.set(e.to_course_id, inc);
      const out = outgoing.get(e.from_course_id) || [];
      out.push(e.to_course_id);
      outgoing.set(e.from_course_id, out);
    }

    const ancestorDist = new Map<number, number>();
    const descDist = new Map<number, number>();
    ancestorDist.set(rootId, 0);
    descDist.set(rootId, 0);

    const q1: number[] = [rootId];
    while (q1.length) {
      const id = q1.shift()!;
      const d = ancestorDist.get(id) || 0;
      for (const p of incoming.get(id) || []) {
        if (!ancestorDist.has(p) || (ancestorDist.get(p) || 0) < d + 1) {
          ancestorDist.set(p, d + 1);
          q1.push(p);
        }
      }
    }
    const q2: number[] = [rootId];
    while (q2.length) {
      const id = q2.shift()!;
      const d = descDist.get(id) || 0;
      for (const c of outgoing.get(id) || []) {
        if (!descDist.has(c) || (descDist.get(c) || 0) < d + 1) {
          descDist.set(c, d + 1);
          q2.push(c);
        }
      }
    }

    const levelById = new Map<number, number>();
    for (const id of byId.keys()) {
      if (id === rootId) levelById.set(id, 0);
      else if (ancestorDist.has(id)) levelById.set(id, -(ancestorDist.get(id) || 0));
      else if (descDist.has(id)) levelById.set(id, descDist.get(id) || 0);
      else levelById.set(id, 0);
    }

    const levels = Array.from(new Set(Array.from(levelById.values()))).sort((a, b) => a - b);
    const cols = new Map<number, PrerequisiteGraphNode[]>();
    for (const lv of levels) cols.set(lv, []);
    for (const n of data.nodes) cols.get(levelById.get(n.id) || 0)!.push(n);
    for (const [lv, arr] of cols.entries()) {
      arr.sort((a, b) => Number(a.is_current) - Number(b.is_current) || a.title.localeCompare(b.title, "vi"));
      cols.set(lv, arr);
    }

    const nodeW = 210;
    const nodeH = showCompletionStatus ? 70 : 52;
    const colGap = 90;
    const rowGap = 26;
    const xByLevel = new Map<number, number>();
    levels.forEach((lv, idx) => xByLevel.set(lv, 30 + idx * (nodeW + colGap)));
    const maxRows = Math.max(1, ...levels.map((lv) => (cols.get(lv) || []).length));
    const height = 40 + maxRows * (nodeH + rowGap);
    const width = 80 + levels.length * (nodeW + colGap);

    const pos = new Map<number, { x: number; y: number }>();
    for (const lv of levels) {
      const arr = cols.get(lv) || [];
      arr.forEach((n, i) => {
        pos.set(n.id, {
          x: xByLevel.get(lv) || 0,
          y: 24 + i * (nodeH + rowGap),
        });
      });
    }

    return { levels, cols, pos, width, height, nodeW, nodeH };
  }, [data]);

  if (!data || !layout) {
    return <div className="prereqGraph__empty">Chưa có sơ đồ tiên quyết.</div>;
  }

  return (
    <div className="prereqGraphDiagram">
      <svg
        className="prereqGraphDiagram__svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
      >
        {data.edges.map((e, idx) => {
          const from = layout.pos.get(e.from_course_id);
          const to = layout.pos.get(e.to_course_id);
          if (!from || !to) return null;
          const x1 = from.x + layout.nodeW;
          const y1 = from.y + layout.nodeH / 2;
          const x2 = to.x;
          const y2 = to.y + layout.nodeH / 2;
          const cx1 = x1 + 28;
          const cx2 = x2 - 28;
          return (
            <path
              key={`${e.from_course_id}-${e.to_course_id}-${idx}`}
              d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
              className="prereqGraphDiagram__edge"
            />
          );
        })}

        {data.nodes.map((n) => {
          const p = layout.pos.get(n.id);
          if (!p) return null;
          return (
            <g
              key={n.id}
              className={`prereqGraphDiagram__nodeGroup ${n.is_current ? "isCurrent" : ""}`}
              onClick={() => (onOpenCourse && n.slug ? onOpenCourse(n.slug) : undefined)}
            >
              <rect x={p.x} y={p.y} width={layout.nodeW} height={layout.nodeH} rx={12} className="prereqGraphDiagram__nodeRect" />
              <text x={p.x + 10} y={p.y + 22} className="prereqGraphDiagram__nodeTitle">
                {n.title.length > 30 ? `${n.title.slice(0, 30)}...` : n.title}
              </text>
              {showCompletionStatus ? (
                <text x={p.x + 10} y={p.y + 42} className={`prereqGraphDiagram__nodeStatus ${n.is_completed ? "done" : "pending"}`}>
                  {n.is_completed ? "✓ Hoàn thành" : "• Chưa hoàn thành"}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
