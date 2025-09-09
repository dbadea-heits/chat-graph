"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import * as d3 from "d3";
import { GraphNode, GraphEdge } from "@/types/graph";
import { COLORS } from "@/constants/colors";
import { Badge } from "./ui/badge";

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeTypes: string[];
  graphId?: string;
}

export default function GraphVisualization({
  nodes,
  edges,
  nodeTypes,
  graphId = "default",
}: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selected, setSelected] = useState<GraphNode | GraphEdge | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear any existing SVG
    d3.select(containerRef.current).selectAll("svg").remove();

    // Create SVG
    const svg = d3
      .select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    svgRef.current = svg.node();
    
    // Create a single container for all elements that will be zoomed together
    const graphContainer = svg.append("g").attr("class", "graph-container");

    // Initialize node positions if they don't exist
    nodes.forEach((node) => {
      if (node.x === undefined || node.y === undefined || isNaN(node.x) || isNaN(node.y)) {
        node.x = width / 2 + (Math.random() - 0.5) * 100;
        node.y = height / 2 + (Math.random() - 0.5) * 100;
      }
    });

    // Create a simulation with forces
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(edges)
          .id((d: any) => d.id)
          .distance(420)
      )
      .force("charge", d3.forceManyBody().strength(-420))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(50));

    // Add a group for the links
    const link = graphContainer
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "#0569f4")
      .attr("stroke-width", 6);

    // Add invisible wider lines to increase the clickable area for edges
    const linkHitArea = graphContainer
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "transparent")
      .attr("stroke-width", 32) // Much wider than the visible line
      .style("cursor", "pointer");

    // Add link labels
    const linkLabels = graphContainer
      .append("g")
      .selectAll("text")
      .data(edges)
      .join("text")
      .text((d: any) => d.type)
      .attr("font-size", 10)
      .attr("fill", "#94A3B8") // Light Gray
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .style("pointer-events", "none");

    // Add a group for the nodes
    const node = graphContainer
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 20)
      .attr("fill", (d: any) => {
        const colorIndex = nodeTypes.indexOf(d.type);
        return colorIndex >= 0 ? COLORS[colorIndex % COLORS.length] : "#6B7280";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer");

    // Add node labels - attach to the graphContainer so they zoom with everything else
    const nodeLabels = graphContainer
      .append("g")
      .attr("class", "node-labels")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x || 0}, ${d.y || 0})`);

    // Add text labels
    nodeLabels
      .append("text")
      .text((d: any) => d.label)
      .attr("font-size", 12)
      .attr("fill", "#FFFFFF")
      .attr("text-anchor", "middle")
      .attr("dy", 35)
      .style("pointer-events", "none");

    // Add drag behavior with improved label positioning
    const drag = d3
      .drag<SVGCircleElement, GraphNode>()
      .on("start", (event, d: any) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
        
        // Update actual position immediately during dragging
        d.x = event.x;
        d.y = event.y;
        
        // Update the corresponding label position during drag
        nodeLabels
          .filter((nd: any) => nd.id === d.id)
          .attr("transform", `translate(${event.x}, ${event.y})`);
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
    });

    // Add click handlers to the wider hit area
    linkHitArea.on("click", (event, d: any) => {
      event.stopPropagation();
      setSelected(d);
    });

    svg.on("click", () => {
      setSelected(null);
    });

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.01, 4])
      .on("zoom", (event) => {
        // Apply the zoom transform only to the graphContainer
        graphContainer.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Set initial zoom level and center the view
    const initialScale = 0.07;
    const centerX = width / 2;
    const centerY = height / 2;
    const transform = d3.zoomIdentity
      .translate(centerX, centerY)
      .scale(initialScale)
      .translate(-centerX, -centerY);

    svg.call(zoom.transform as any, transform);

    // Update positions in each tick of the simulation
    simulation.on("tick", () => {
      // Helper function to get valid coordinates or defaults
      const validCoord = (val: any) => !isNaN(val) && val !== undefined ? val : 0;
      
      // Update link positions with valid coordinates
      link
        .attr("x1", (d: any) => validCoord(d.source.x))
        .attr("y1", (d: any) => validCoord(d.source.y))
        .attr("x2", (d: any) => validCoord(d.target.x))
        .attr("y2", (d: any) => validCoord(d.target.y));

      // Update the hit area positions with valid coordinates
      linkHitArea
        .attr("x1", (d: any) => validCoord(d.source.x))
        .attr("y1", (d: any) => validCoord(d.source.y))
        .attr("x2", (d: any) => validCoord(d.target.x))
        .attr("y2", (d: any) => validCoord(d.target.y));
      
      // Update node positions with valid coordinates
      node.attr("cx", (d: any) => validCoord(d.x))
          .attr("cy", (d: any) => validCoord(d.y));

      // Update node label positions with valid coordinates
      nodeLabels.attr("transform", (d: any) => {
        return `translate(${validCoord(d.x)}, ${validCoord(d.y)})`;
      });

      // Update link label positions with valid coordinates
      linkLabels
        .attr("x", (d: any) => (validCoord(d.source.x) + validCoord(d.target.x)) / 2)
        .attr("y", (d: any) => (validCoord(d.source.y) + validCoord(d.target.y)) / 2);
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
  }, [nodes, edges]);

  return (
    <div className="h-full relative bg-slate-900">
      <div ref={containerRef} className="w-full h-full" />

      {/* Node Details Panel */}
      {selected && (
        <Card className="absolute top-4 left-4 bg-slate-800/90 border-slate-600 backdrop-blur-sm w-full max-w-md">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-100">
                  {"label" in selected ? selected.label : selected.type}
                </h3>
                <Badge
                  key={selected.type}
                  variant="outline"
                  className={`cursor-pointer transition-colors border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500`}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      style={{
                        "--color": COLORS[
                          nodeTypes.indexOf(selected.type) % COLORS.length
                        ] ?? "#6B7280",
                      } as React.CSSProperties}
                      className="w-2 h-2 rounded-full bg-[var(--color)]"
                    />
                    {selected.type}
                  </div>
                </Badge>
              </div>
              <hr className="border-slate-600" />
              {Object.entries(selected.properties).map(([key, value]) => (
                <div key={key}>
                  <div className="flex gap-4 justify-between text-sm">
                    <span className="text-slate-400">{key}:</span>
                    <span className="text-slate-200">{value}</span>
                  </div>
                  <hr className="border-slate-600" />
                </div>
              ))}
              {(selected as GraphEdge).source?.label && (selected as GraphEdge).target?.label && (
                <>
                  <div className="flex gap-4 justify-between text-sm">
                    <span className="text-slate-400">source:</span>
                    <span className="text-slate-200">
                      {(selected as GraphEdge).source.label}
                    </span>
                  </div>
                  <hr className="border-slate-600" />
                  <div className="flex gap-4 justify-between text-sm">
                    <span className="text-slate-400">target:</span>
                    <span className="text-slate-200">
                      {(selected as GraphEdge).target.label}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
