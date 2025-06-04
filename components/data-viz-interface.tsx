"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, Maximize2, RefreshCw } from "lucide-react"
import GraphVisualization from "@/components/graph-visualization"
import { useNeo4jGraph } from "@/hooks/use-neo4j-graph"
import { apiConfig } from "@/lib/api-config"
import { COLORS } from "@/constants/colors"

export default function DataVizInterface() {
  const { 
    nodes, 
    edges, 
    refreshData: refreshHookData,
  } = useNeo4jGraph()
  
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([])
  const [filterQuery, setFilterQuery] = useState("")
  const [appliedQuery, setAppliedQuery] = useState("")
  const [isFiltering, setIsFiltering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingSymbol, setLoadingSymbol] = useState("◴");
  const [currentStep, setCurrentStep] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  // Get unique node types for filtering
  const nodeTypes = Array.from(new Set(nodes.map((node) => node.type)))

  // Filter nodes and edges based on selected types
  const { filteredNodes, filteredEdges } = useMemo(() => {
    if (nodes.length === 0 || edges.length === 0) return { filteredNodes: [], filteredEdges: [] };

    const filteredNodes = selectedNodeTypes.length > 0
      ? nodes.filter(node => selectedNodeTypes.includes(node.type))
      : nodes;

    const filteredEdges = selectedNodeTypes.length > 0
      ? edges.filter(edge => 
          filteredNodes.some(node => node.id === edge.source.id) && 
          filteredNodes.some(node => node.id === edge.target.id)
        )
      : edges;

    return { filteredNodes, filteredEdges };
  }, [nodes, edges, selectedNodeTypes]);

  // Filter graph data based on search, query, and selected types
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollJobStatus = async (jobId: string) => {
      try {
        const response = await fetch(`${apiConfig.baseUrl}${apiConfig.jobStatusEndpoint}/${jobId}`);
        const data = await response.json();

        if (data.status === "error") {
          console.error("Job failed:", data.error);
          setIsFiltering(false);
          return;
        }

        setProgress(data.progress);
        setCurrentStep(data.current_step || "");

        if (data.progress === 1) {
          // Job is complete, update the filtered nodes and edges
          if (data.result) {
            console.log("Job completed, updating filtered nodes and edges");
            
            if (data.result.entity_count === 0) {
              setShowWarning(true);
              setIsFiltering(false);
              clearInterval(pollInterval);
              clearFilters();
              return;
            }
            
            // Make API call to update Neo4j with the filtered graph
            fetch(`${apiConfig.baseUrl}${apiConfig.updateNeo4jEndpoint}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                graph_path: data.result.graph_path,
                clear_existing: true
              }),
            })
            .then(response => response.json())
            .then(updateData => {
              console.log("Neo4j update response:", updateData);
              setCurrentStep("Updating Neo4j Graph");
              // Refresh the graph data from Neo4j with the new graph_id
              refreshHookData(updateData.graph_id);
            })
            .catch(error => {
              console.error("Error updating Neo4j:", error);
            })
            .finally(() => {
              setIsFiltering(false);
              clearInterval(pollInterval);
            });
          }
        }
        else {
          console.log("Job not complete, progress:", data.progress);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
        setIsFiltering(false);
        clearInterval(pollInterval);
      }
    };

    const applyFilter = async () => {
      try {
        console.log("Applying filter:", appliedQuery);
        setIsFiltering(true);
        setProgress(0);

        const response = await fetch(`${apiConfig.baseUrl}${apiConfig.filterGraphEndpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input_text: appliedQuery,
            graph_name: "filtered_graph"
          }),
        });

        const data = await response.json();
        
        if (data.job_id) {
          // Start polling for job status
          pollInterval = setInterval(() => pollJobStatus(data.job_id), 1000);
        }
      } catch (error) {
        console.error("Error applying filter:", error);
        setIsFiltering(false);
      }
    };

    if (appliedQuery) {
      applyFilter();
    } else {
      console.log("No query, showing all nodes");
    }

    // Cleanup function to clear interval
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [appliedQuery]);

  // Animate loading symbol
  useEffect(() => {
    if (!isFiltering) return;
    
    const symbols = ["◴", "◷", "◶", "◵"];
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % symbols.length;
      setLoadingSymbol(symbols[currentIndex]);
    }, 400);

    return () => clearInterval(interval);
  }, [isFiltering]);

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
          <p className="text-sm text-slate-400">Filter and explore your AI's knowledge base.</p>
        </div>
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
                  placeholder="Enter a query to filter your knowledge base (e.g. 'Ethics Application')"
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

              {/* Query Examples */}
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-400 mb-1 block">Example Queries:</label>
                <div className="space-y-1">
                  {[
                    "How critical thinking affects ethics.",
                    "What makes a good critical thinker.",
                    "Compare right action vs virtue theory.",
                    "Compare old and new virtue theory views.",
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
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ 
                          backgroundColor: COLORS[nodeTypes.indexOf(type) % COLORS.length] || "#6B7280"
                        }} 
                      />
                      {type}
                    </div>
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

          {/* Loading Overlay */}
          {isFiltering && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
              <div className="w-64 space-y-4">
                <div className="text-slate-200 text-center">
                  {loadingSymbol} {currentStep || "Initializing"}
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-[#9e58bd] h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="text-slate-400 text-sm text-center">
                  {Math.round(progress * 100)}% complete
                </div>
              </div>
            </div>
          )}

          {/* Warning Message */}
          {showWarning && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
              <div className="w-96 p-6 bg-slate-800 rounded-lg border border-yellow-500/50">
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">No Results Found</h3>
                <p className="text-slate-300 mb-4">
                  Your query appears to be outside the scope of the current knowledge graph. Try modifying your search terms or exploring different aspects of the graph.
                </p>
                <Button
                  onClick={() => setShowWarning(false)}
                  className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          <GraphVisualization 
            nodes={filteredNodes}
            edges={filteredEdges}
            nodeTypes={nodeTypes}
          />

          {/* Graph Stats */}
          <Card className="absolute bottom-4 right-4 bg-slate-800/90 border-slate-600 backdrop-blur-sm">
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
                <span className="text-slate-100 font-medium">{selectedNodeTypes.length}</span>
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
        </div>
      </div>
    </div>
  )
}
