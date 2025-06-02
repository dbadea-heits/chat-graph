"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import * as d3 from "d3";
import { useNeo4jGraph } from "@/hooks/use-neo4j-graph";
import { GraphNode, GraphEdge } from "@/types/graph";
import { NODE_COLORS } from "@/constants/colors";

export default function GraphVisualization() {
  const { nodes, edges, searchQuery, isLoading, error } = useNeo4jGraph();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selected, setSelected] = useState<GraphNode | GraphEdge | null>(null);

  useEffect(() => {
    if (!containerRef.current || isLoading || error) return;
    if (nodes.length === 0 || edges.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear any existing SVG
    d3.select(containerRef.current).selectAll("svg").remove();

    // Create SVG
    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    svgRef.current = svg.node();

    // Create a simulation with forces
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d: any) => d.id).distance(420))
      .force("charge", d3.forceManyBody().strength(-420))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(50));

    // Add a group for the links
    const link = svg.append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "#0569f4")
      .attr("stroke-width", 6);

    // Add link labels
    const linkLabels = svg.append("g")
      .selectAll("text")
      .data(edges)
      .join("text")
      .text((d: any) => d.type)
      .attr("font-size", 10)
      .attr("fill", "#94A3B8") // Light Gray
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .style("pointer-events", "none")
      .style("visibility", "hidden");
      
    // Add a group for the nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 20)
      .attr("fill", (d: any) => NODE_COLORS[d.properties.entity_type?.toLowerCase() as keyof typeof NODE_COLORS] || "#6B7280")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .style("filter", (d: any) => {
        if (searchQuery && 
            (d.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
             d.type.toLowerCase().includes(searchQuery.toLowerCase()))) {
          return "drop-shadow(0 0 10px #FBBF24)";
        }
        return "none";
      });
      
    // Add node labels with colored circles
    const nodeLabels = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);

    // Add colored circles to labels
    nodeLabels.append("circle")
      .attr("r", 6)
      .attr("fill", (d: any) => NODE_COLORS[d.properties.entity_type?.toLowerCase() as keyof typeof NODE_COLORS] || "#6B7280")
      .attr("cy", 35);

    // Add text labels
    nodeLabels.append("text")
      .text((d: any) => d.label)
      .attr("font-size", 12)
      .attr("fill", "#FFFFFF")
      .attr("text-anchor", "middle")
      .attr("dy", 45)
      .style("pointer-events", "none");

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on("start", (event, d: any) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d: any) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag as any);

    // Add click handlers
    node.on("click", (event, d: any) => {
      event.stopPropagation();
      setSelected(d);
    });

    link.on("click", (event, d: any) => {
      event.stopPropagation();
      setSelected(d);
      linkLabels.style("visibility", (l: any) => 
        l === d ? "visible" : "hidden"
      );
    });

    svg.on("click", () => {
      setSelected(null);
      linkLabels.style("visibility", "hidden");
    });

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.01, 4])
      .on("zoom", (event) => {
        const group = svg.selectAll("g");
        group.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Update positions in each tick of the simulation
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      nodeLabels
        .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
        
      linkLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
    });

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current && svgRef.current) {
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        
        // Update SVG dimensions
        d3.select(svgRef.current)
          .attr("width", newWidth)
          .attr("height", newHeight)
          .attr("viewBox", [0, 0, newWidth, newHeight]);
          
        // Update center force
        simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
        simulation.alpha(0.3).restart();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      simulation.stop();
    };
  }, [nodes, edges, searchQuery, isLoading, error]);

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
                      ? (NODE_COLORS[selected.properties.entity_type?.toLowerCase() as keyof typeof NODE_COLORS] || "#6B7280")
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
    </div>
  );
}

