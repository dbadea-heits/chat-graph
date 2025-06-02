"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, Maximize2, RefreshCw, HelpCircle } from "lucide-react"
import GraphVisualization from "@/components/graph-visualization"
import { useNeo4jGraph } from "@/hooks/use-neo4j-graph"
import { GraphNode, GraphEdge } from "@/types/graph"

export default function DataVizInterface() {
  const { 
    nodes, 
    edges, 
    searchQuery: hookSearchQuery, 
    setSearchQuery: setHookSearchQuery,
    refreshData,
    isLoading,
    error 
  } = useNeo4jGraph()
  
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([])
  const [filteredNodes, setFilteredNodes] = useState<GraphNode[]>([])
  const [filteredEdges, setFilteredEdges] = useState<GraphEdge[]>([])
  const [filterQuery, setFilterQuery] = useState("")
  const [appliedQuery, setAppliedQuery] = useState("")

  // Set up filtering effect
  useEffect(() => {
    // Initialize filtered data with all nodes/edges when they change
    setFilteredNodes(nodes);
    setFilteredEdges(edges);
  }, [nodes, edges]);

  // Apply filtering when filter parameters change
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Apply type filtering
    let filteredNodeList = nodes;
    if (selectedNodeTypes.length > 0) {
      filteredNodeList = nodes.filter((node) => selectedNodeTypes.includes(node.type));
    }
    
    // Apply query filtering if needed
    if (appliedQuery) {
      try {
        const query = appliedQuery.toLowerCase();
        
        // Simple query parser (this could be more sophisticated)
        if (query.includes(' with ')) {
          const [nodeType, propertyFilter] = query.split(' with ');
          const [property, value] = propertyFilter.split(' ');
          
          filteredNodeList = filteredNodeList.filter(
            (node) => 
              node.type.toLowerCase() === nodeType && 
              node.properties[property] && 
              String(node.properties[property]).toLowerCase().includes(value)
          );
        } else {
          // Basic text search in all properties
          filteredNodeList = filteredNodeList.filter((node) => {
            return (
              node.label.toLowerCase().includes(query) ||
              node.type.toLowerCase().includes(query) ||
              Object.entries(node.properties).some(
                ([key, value]) => String(value).toLowerCase().includes(query)
              )
            );
          });
        }
      } catch (e) {
        console.error("Filter query parsing error:", e);
      }
    }
  }, [])

  // Get unique node types for filtering
  const nodeTypes = Array.from(new Set(nodes.map((node) => node.type)))

  // Filter graph data based on search, query, and selected types
  useEffect(() => {
    let filtered = nodes

    // Filter by quick search query
    // if (searchQuery) {
    //   filtered = filtered.filter(
    //     (node) =>
    //       node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    //       node.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    //       Object.values(node.properties).some((value) =>
    //         value.toString().toLowerCase().includes(searchQuery.toLowerCase()),
    //       ),
    //   )
    // }

    // Filter by advanced query
    if (appliedQuery) {
      filtered = filtered.filter((node) => {
        const query = appliedQuery.toLowerCase()

        // Parse simple query patterns
        if (query.includes("person") && query.includes("age >")) {
          const ageMatch = query.match(/age\s*>\s*(\d+)/)
          if (ageMatch && node.type === "Person") {
            const targetAge = Number.parseInt(ageMatch[1])
            return node.properties.age > targetAge
          }
        }

        if (query.includes("company") && query.includes("in technology")) {
          return node.type === "Company" && node.properties.industry === "Technology"
        }

        if (query.includes("project") && query.includes("status active")) {
          return node.type === "Project" && node.properties.status === "Active"
        }

        if (query.includes("technology") && query.includes("popularity high")) {
          return node.type === "Technology" && node.properties.popularity === "High"
        }

        // Fallback to general text search
        return (
          node.label.toLowerCase().includes(query) ||
          node.type.toLowerCase().includes(query) ||
          Object.values(node.properties).some((value) => value.toString().toLowerCase().includes(query))
        )
      })
    }

    // Filter by selected node types
    if (selectedNodeTypes.length > 0) {
      filtered = filtered.filter((node) => selectedNodeTypes.includes(node.type))
    }

    setFilteredNodes(filtered)

    // Filter edges to only show connections between visible nodes
    const visibleNodeIds = new Set(filtered.map((node) => node.id))
    const filteredEdgeList = edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
    setFilteredEdges(filteredEdgeList)
  }, [appliedQuery, selectedNodeTypes, nodes, edges])

  const toggleNodeType = (type: string) => {
    setSelectedNodeTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const clearFilters = () => {
    setFilterQuery("")
    setAppliedQuery("")
    setSelectedNodeTypes([])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Data Visualization</h2>
          <p className="text-sm text-slate-400">Neo4j Bloom-style graph exploration and filtering</p>
        </div>
        <Button
          variant="outline"
          className="border-slate-600 text-[#00828e] hover:bg-[#00828e]/10 hover:border-[#00828e]"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Graph Help
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Advanced Filter Query */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">Graph Filter Query</label>
              <div className="space-y-2">
                <textarea
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Enter filter query (e.g., 'Person with role Developer' or 'Company in Technology')"
                  className="w-full h-20 p-3 bg-slate-700 border border-slate-600 text-slate-200 placeholder:text-slate-400 rounded-md resize-none text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => setAppliedQuery(filterQuery)}
                    className="flex-1 bg-[#9e58bd] hover:bg-[#8a4ba8] text-white"
                    size="sm"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Apply Filter
                  </Button>
                  <Button
                    onClick={() => {
                      setFilterQuery("")
                      setAppliedQuery("")
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    size="sm"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Quick Search */}
              <div className="mt-4">
                <label className="text-sm font-medium text-slate-400 mb-2 block">Quick Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    value=""                    onChange={(e) => null}
                    placeholder="Quick search..."
                    className="pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Query Examples */}
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-400 mb-1 block">Example Queries:</label>
                <div className="space-y-1">
                  {[
                    "Person with age > 30",
                    "Company in Technology",
                    "Project with status Active",
                    "Technology with popularity High",
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setFilterQuery(example)}
                      className="block text-xs text-[#00828e] hover:text-[#00a3b0] cursor-pointer"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Node Type Filters */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">Filter by Node Type</label>
              <div className="flex flex-wrap gap-2">
                {nodeTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={selectedNodeTypes.includes(type) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      selectedNodeTypes.includes(type)
                        ? "bg-[#9e58bd] hover:bg-[#8a4ba8] text-white border-[#9e58bd]"
                        : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                    }`}
                    onClick={() => toggleNodeType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>

            {/* Graph Stats */}
            <Card className="bg-slate-700/50 border-slate-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-200">Graph Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Nodes:</span>
                  <span className="text-slate-100 font-medium">
                    {filteredNodes.length} / {nodes.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Relationships:</span>
                  <span className="text-slate-100 font-medium">
                    {filteredEdges.length} / {edges.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Node Types:</span>
                  <span className="text-slate-100 font-medium">{nodeTypes.length}</span>
                </div>
                {appliedQuery && (
                  <div className="pt-2 border-t border-slate-600">
                    <div className="text-xs text-slate-400 mb-1">Active Filter:</div>
                    <div className="text-xs text-[#00828e] bg-[#00828e]/10 p-2 rounded border border-[#00828e]/30">
                      {appliedQuery}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Neo4j Bloom Info */}
            <Card className="bg-gradient-to-r from-[#9e58bd]/20 to-[#00828e]/20 border-slate-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#9e58bd]">Neo4j Bloom Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-300">
                  This visualization simulates Neo4j Bloom's graph exploration capabilities with interactive filtering
                  and search.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Graph Area */}
        <div className="flex-1 relative bg-slate-900">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Fullscreen
            </Button>
          </div>

          <GraphVisualization />
        </div>
      </div>
    </div>
  )
}
