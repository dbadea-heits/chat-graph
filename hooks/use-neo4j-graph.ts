import { useState, useEffect } from 'react';
import neo4jService from '@/lib/neo4j-service';
import { GraphNode, GraphEdge } from '@/types/graph';

interface UseNeo4jGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  d3Data: { nodes: any[], edges: any[] };
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refreshData: (graphId?: string) => Promise<void>;
}

export function useNeo4jGraph(initialGraphId: string = "default"): UseNeo4jGraphResult {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [d3Data, setD3Data] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentGraphId, setCurrentGraphId] = useState<string>(initialGraphId);

  // Connect to Neo4j on component mount
  useEffect(() => {
    const connectToNeo4j = async () => {
      try {
        await neo4jService.connect();
        setIsConnected(true);
      } catch (err) {
        setError('Failed to connect to Neo4j database. Please make sure your Neo4j instance is running.');
        console.error('Neo4j connection error:', err);
        setIsLoading(false);
      }
    };

    connectToNeo4j();

    // Disconnect when component unmounts
    return () => {
      neo4jService.disconnect().catch(err => {
        console.error('Error disconnecting from Neo4j:', err);
      });
    };
  }, []);

  // Fetch graph data whenever search query changes or connection is established
  useEffect(() => {
    if (!isConnected) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // If search query is empty, use getGraphData with currentGraphId
        let data;
        if (!searchQuery) {
          data = await neo4jService.getGraphData(currentGraphId);
        } else {
          // Otherwise use searchGraph
          data = await neo4jService.searchGraph(searchQuery);
        }
        
        setNodes(data.nodes);
        setEdges(data.edges);
        
        // Get D3 formatted data
        const d3FormattedData = await neo4jService.getD3GraphData(data.nodes, data.edges);
        setD3Data(d3FormattedData);
      } catch (err) {
        console.error('Error fetching graph data:', err);
        setError('Failed to fetch graph data from Neo4j');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchQuery, isConnected, currentGraphId]);

  // Function to manually refresh data
  const refreshData = async (graphId?: string) => {
    if (graphId) {
      setCurrentGraphId(graphId);
    }
    
    if (!isConnected) {
      try {
        await neo4jService.connect();
        setIsConnected(true);
      } catch (err) {
        setError('Failed to connect to Neo4j database');
        console.error('Neo4j connection error:', err);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Get raw graph data
      const data = await neo4jService.getGraphData(graphId || currentGraphId);
      setNodes(data.nodes);
      setEdges(data.edges);
      
      // Get D3 formatted data
      const d3FormattedData = await neo4jService.getD3GraphData(data.nodes, data.edges);
      setD3Data(d3FormattedData);
    } catch (err) {
      console.error('Error refreshing graph data:', err);
      setError('Failed to refresh graph data from Neo4j');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    nodes,
    edges,
    d3Data,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refreshData
  };
}
