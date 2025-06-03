"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import * as d3 from "d3";
import { GraphNode, GraphEdge } from "@/types/graph";
import { NODE_COLORS } from "@/constants/colors";

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function GraphVisualization({ nodes, edges}: GraphVisualizationProps) {
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
    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    svgRef.current = svg.node();

    // Create a simulation with forces
    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink<GraphNode, GraphEdge>().id((d: any) => d.id).distance(600))
      .force("charge", d3.forceManyBody().strength(-3000))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(300));

    // Add a group for the links
    const link = svg.append("g")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("class", "link");

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
      .style("pointer-events", "none");
      
    // Add a group for the nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", 20)
      .attr("fill", (d: any) => NODE_COLORS[d.properties.entity_type?.toLowerCase() as keyof typeof NODE_COLORS] || "#6B7280")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      
    // Add node labels with colored circles
    const nodeLabels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "node-label")
      .text(d => d.properties.displayName)
      .attr("x", 20 + 2)
      .attr("y", 3);

    // Add text labels
    nodeLabels.append("text")
      .text((d: any) => d.label)
      .attr("font-size", 12)
      .attr("fill", "#FFFFFF")
      .attr("text-anchor", "middle")
      .attr("dy", 35)
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

    // Add click handlers
    node.on("click", (event, d: any) => {
      event.stopPropagation();
      setSelected(d);
    });

    link.on("click", (event, d: any) => {
      event.stopPropagation();
      setSelected(d);
    });

    svg.on("click", () => {
      setSelected(null);
    });

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.01, 4])
      .on("zoom", (event) => {
        const group = svg.selectAll("g");
        group.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Set initial zoom level and center the view
    const initialScale = 1;  // Start at normal scale
    const centerX = width / 2;
    const centerY = height / 2;
    const transform = d3.zoomIdentity
      .translate(centerX, centerY)
      .scale(initialScale)
      .translate(-centerX, -centerY);
    
    svg.call(zoom.transform as any, transform);

    // Update positions in each tick of the simulation
    simulation.nodes(nodes)
      .on("tick", () => {
          link
              .attr("x1", d => d.source.x)
              .attr("y1", d => d.source.y)
              .attr("x2", d => d.target.x)
              .attr("y2", d => d.target.y);

          node
              .attr("cx", d => d.x)
              .attr("cy", d => d.y);

          nodeLabels
              .attr("transform", d => `translate(${d.x}, ${d.y})`);
      });

    // Fix the type error with force link
    const linkForce = simulation.force("link") as d3.ForceLink<GraphNode, GraphEdge>;
    linkForce.links(edges);

    return () => {
      simulation.stop();
    };
  }, [nodes, edges]);

  return (
    <div className="h-full relative bg-slate-900">
      <div ref={containerRef} className="w-full h-full" />

      {/* Node Details Panel */}
      {selected && (
        <Card className="absolute top-4 left-4 w-64 bg-slate-800/90 border-slate-600 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
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

