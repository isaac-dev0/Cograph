import {
  getFileTypeColor,
  transformGraphData,
  filterGraphData,
} from "@/components/graph/utils/graphDataTransform";
import type { DependencyGraph } from "@/lib/types/graph";

// ── Fixtures ───────────────────────────────────────────────

const makeGraph = (overrides: Partial<DependencyGraph> = {}): DependencyGraph => ({
  nodes: [
    { id: "node-1", label: "index.ts", type: "FILE", data: JSON.stringify({ fileType: "typescript", linesOfCode: 120 }) },
    { id: "node-2", label: "utils.tsx", type: "FILE", data: JSON.stringify({ fileType: "tsx", linesOfCode: 40 }) },
    { id: "node-3", label: "App.js",   type: "FILE", data: JSON.stringify({ fileType: "javascript", linesOfCode: 80 }) },
  ],
  edges: [
    { id: "edge-1", source: "node-1", target: "node-2", type: "IMPORTS" },
    { id: "edge-2", source: "node-1", target: "node-3", type: "IMPORTS" },
  ],
  ...overrides,
});

// ── getFileTypeColor ──────────────────────────────────────

describe("getFileTypeColor", () => {
  it("returns the correct colour for known extensions", () => {
    expect(getFileTypeColor("ts")).toBe("#3178c6");
    expect(getFileTypeColor("tsx")).toBe("#9333ea");
    expect(getFileTypeColor("js")).toBe("#f7df1e");
    expect(getFileTypeColor("jsx")).toBe("#fb923c");
    expect(getFileTypeColor("css")).toBe("#1572b6");
  });

  it("is case-insensitive", () => {
    expect(getFileTypeColor("TS")).toBe(getFileTypeColor("ts"));
    expect(getFileTypeColor("TSX")).toBe(getFileTypeColor("tsx"));
  });

  it("strips a leading dot from the extension", () => {
    expect(getFileTypeColor(".ts")).toBe(getFileTypeColor("ts"));
  });

  it("returns the default colour for unknown extensions", () => {
    expect(getFileTypeColor("unknown")).toBe("#6366f1");
    expect(getFileTypeColor("")).toBe("#6366f1");
  });
});

// ── transformGraphData ────────────────────────────────────

describe("transformGraphData", () => {
  it("maps FILE nodes to ForceGraphNode objects", () => {
    const graph = makeGraph();
    const result = transformGraphData(graph);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0]).toMatchObject({ id: "node-1", name: "index.ts", fileType: "ts" });
    expect(result.nodes[1]).toMatchObject({ id: "node-2", name: "utils.tsx", fileType: "tsx" });
  });

  it("normalises long-form file type names", () => {
    const graph = makeGraph();
    const result = transformGraphData(graph);
    const tsNode = result.nodes.find((node) => node.id === "node-1");
    expect(tsNode?.fileType).toBe("ts");
    const jsNode = result.nodes.find((node) => node.id === "node-3");
    expect(jsNode?.fileType).toBe("js");
  });

  it("maps edges to ForceGraphLink objects with correct source/target", () => {
    const graph = makeGraph();
    const result = transformGraphData(graph);
    expect(result.links).toHaveLength(2);
    expect(result.links[0]).toMatchObject({ source: "node-1", target: "node-2" });
  });

  it("filters out non-FILE nodes", () => {
    const graph = makeGraph({
      nodes: [
        ...makeGraph().nodes,
        { id: "entity-1", label: "myFunction", type: "FUNCTION", data: "{}" },
      ],
    });
    const result = transformGraphData(graph);
    expect(result.nodes.every((node) => node.type === "FILE")).toBe(true);
    expect(result.nodes).toHaveLength(3);
  });

  it("returns empty nodes and links for an empty graph", () => {
    const result = transformGraphData({ nodes: [], edges: [] });
    expect(result.nodes).toHaveLength(0);
    expect(result.links).toHaveLength(0);
  });
});

// ── filterGraphData ───────────────────────────────────────

describe("filterGraphData", () => {
  it("returns all nodes when no filters are applied", () => {
    const data = transformGraphData(makeGraph());
    const result = filterGraphData(data, {});
    expect(result.nodes).toHaveLength(data.nodes.length);
    expect(result.links).toHaveLength(data.links.length);
  });

  it("filters by fileType", () => {
    const data = transformGraphData(makeGraph());
    const result = filterGraphData(data, { fileTypes: ["ts"] });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].fileType).toBe("ts");
    expect(result.links).toHaveLength(0);
  });

  it("removes links whose source or target node was filtered out", () => {
    const data = transformGraphData(makeGraph());
    const result = filterGraphData(data, { fileTypes: ["ts", "tsx"] });
    expect(result.nodes).toHaveLength(2);
    expect(result.links).toHaveLength(1);
    expect(result.links[0]).toMatchObject({ source: "node-1", target: "node-2" });
  });
});
