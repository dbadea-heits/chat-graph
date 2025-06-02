"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Graph } from "@antv/g6";
import { useNeo4jGraph } from "@/hooks/use-neo4j-graph";
import { GraphNode, GraphEdge } from "@/types/graph";

export default function GraphVisualization() {
  const { nodes, edges, g6Data, searchQuery, isLoading, error } = useNeo4jGraph();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [selected, setSelected] = useState<GraphNode | GraphEdge | null>(null);

  const nodeColors: Record<string, string> = {
    Person: "#9e58bd", // Purple
    Company: "#00828e", // Teal
    Project: "#f59e0b", // Amber
    Technology: "#1c005f", // Violet
    Team: "#ef4444", // Red
  };

  // Format data for G6
  // const formatData = () => {
  //   const formattedNodes = nodes.map((node) => ({
  //     id: node.id,
  //     data: {
  //       label: node.label,
  //       type: node.type,
  //       properties: node.properties,
  //     },
  //     style: {
  //       x: node.x,
  //       y: node.y,
  //       labelFontSize: 20,
  //       labelText: node.label,
  //       fill: nodeColors[node.type] || "#6B7280",
  //       stroke: "#fff",
  //       lineWidth: 1,
  //       shadowColor:
  //         searchQuery &&
  //         (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //           node.type.toLowerCase().includes(searchQuery.toLowerCase()))
  //           ? "#FBBF24"
  //           : "",
  //       shadowBlur:
  //         searchQuery &&
  //         (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //           node.type.toLowerCase().includes(searchQuery.toLowerCase()))
  //           ? 10
  //           : 0,
  //     },
  //   }));

  //   const formattedEdges = edges.map((edge) => ({
  //     id: edge.id,
  //     source: edge.source,
  //     target: edge.target,
  //     data: {
  //       type: edge.type,
  //       properties: edge.properties,
  //       label: edge.type,
  //     },
  //     style: {
  //       label: false,
  //       labelText: edge.type,
  //       labelBackground: true,
  //       stroke: "#0569f4",
  //       lineWidth: 4,
  //     },
  //     state: {
  //       active: {
  //         label: true,
  //       },
  //     },
  //   }));
  //   return {
  //     nodes: formattedNodes,
  //     edges: formattedEdges,
  //   };
  // };

  useEffect(() => {
    if (!containerRef.current || isLoading || error) return;
    if (nodes.length === 0 || edges.length === 0) return;

    console.log("Edges:", g6Data.edges);
    if (!graphRef.current) {
      // Initialize G6 graph
      graphRef.current = new Graph({
        container: containerRef.current,
        data: g6Data,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        // Configure node appearance
        node: {
          type: "circle",
          style: {
            size: 40,
            labelPlacement: "bottom",
            labelOffset: 10,
            labelFill: "#FFFFFF",
            labelFontSize: 12,
          },
        },
        // Configure edge appearance
        edge: {
          type: "line",
          style: {
            stroke: "#0569f4",
            lineWidth: 2,
            endArrow: true,
            labelPlacement: "center",
            labelStyle: {
              fill: "#94A3B8",
              fontSize: 10,
            },
          },
        },
        // Add interactive behaviors
        behaviors: ["drag-canvas", "zoom-canvas", "drag-element"],
      });

      // Node click event
      graphRef.current.on("node:click", (evt: any) => {
        const nodeId = evt.target.id;
        const clickedNode = nodes.find((n) => n.id === nodeId) || null;
        setSelected(clickedNode);
      });

      // Edge click event
      graphRef.current.on("edge:click", (evt: any) => {
        const edgeId = evt.target.id;
        const clickedEdge = edges.find((n) => n.id === edgeId) || null;
        setSelected(clickedEdge);
      });

      // Canvas click event (deselect node)
      graphRef.current.on("canvas:click", () => {
        setSelected(null);
      });
      console.log(graphRef.current, "Graph instance after initialization");
      graphRef.current.render();
    } else {
      if (graphRef.current) {
        graphRef.current.updateData(data);
        graphRef.current.render();
      }
    }

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        graphRef.current.changeSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [nodes, edges, searchQuery, isLoading, error]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="h-full relative bg-slate-900">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white">Loading graph data...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      )}
      
      <div ref={containerRef} className="w-full h-full" />

      {/* Node Details Panel */}
      {selected && (
        <Card className="absolute top-4 left-4 w-64 bg-slate-800/90 border-slate-600 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: 'label' in selected 
                      ? (nodeColors[selected.type] || "#6B7280")
                      : "#6B7280",
                  }}
                />
                <h3 className="font-semibold text-slate-100">
                  {'label' in selected ? selected.label : selected.type}
                </h3>
              </div>
              <p className="text-sm text-slate-300">{selected.type}</p>
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Properties
                </h4>
                {Object.entries(selected.properties).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-slate-400">{key}:</span>
                    <span className="text-slate-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="absolute bottom-4 right-4 bg-slate-800/90 border-slate-600 backdrop-blur-sm">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-slate-100 mb-2">
            Node Types
          </h4>
          <div className="space-y-1">
            {Object.entries(nodeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-300">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
