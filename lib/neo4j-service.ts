import neo4j, { Driver, Session, Record } from 'neo4j-driver';
import { GraphNode, GraphEdge } from '@/types/graph';
import { neo4jConfig } from './neo4j-config';

class Neo4jService {
  private driver: Driver | null = null;
  private uri: string;
  private httpUri: string;
  private username: string;
  private password: string;

  constructor(
    uri: string = neo4jConfig.uri,
    httpUri: string = neo4jConfig.httpUri,
    username: string = neo4jConfig.username,
    password: string = neo4jConfig.password
  ) {
    this.uri = uri;
    this.httpUri = httpUri;
    this.username = username;
    this.password = password;
  }

  async connect(): Promise<void> {
    try {
      this.driver = neo4j.driver(
        this.uri,
        neo4j.auth.basic(this.username, this.password)
      );
      
      // Test the connection
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      console.log('Successfully connected to Neo4j');
    } catch (error) {
      console.error('Failed to connect to Neo4j:', error);
      throw error;
    }
  }

  private getSession(): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized. Call connect() first.');
    }
    return this.driver.session();
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  // Convert Neo4j node to GraphNode format
  private nodeToGraphNode(record: Record, nodeVar: string = 'n'): GraphNode {
    const node = record.get(nodeVar);
    const nodeId = node.identity.toString();
    
    return {
      id: nodeId,
      label: node.properties.displayName || node.properties.title || nodeId,
      type: Array.isArray(node.labels) ? node.labels[0] : 'Unknown',
      properties: { ...node.properties },
      // We'll set x and y to 0 initially; the graph layout will position them
      x: 0,
      y: 0
    };
  }

  // Convert Neo4j relationship to GraphEdge format
  private relationToGraphEdge(record: Record, relVar: string = 'r'): GraphEdge {
    const rel = record.get(relVar);
    const sourceId = record.get('source').identity.toString();
    const targetId = record.get('target').identity.toString();
    
    return {
      id: rel.identity.toString(),
      source: sourceId,
      target: targetId,
      type: rel.type,
      properties: { ...rel.properties }
    };
  }

  // Get all nodes and relationships from the database
  async getGraphData(graphId: string = "default"): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }> {
    console.log("Progress - query neo4j");
    try {
      const response = await fetch(`${this.httpUri}/db/neo4j/tx/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
        },
        body: JSON.stringify({
          statements: [{
            statement: `
              MATCH (n {graph_id: $graphId})
              OPTIONAL MATCH (n)-[r]->(m {graph_id: $graphId})
              RETURN n, r, m
            `,
            parameters: {
              graphId: graphId || ''
            },
            resultDataContents: ["graph"]
          }]
        })
      });

      const data = await response.json();
      return this.processNeo4jData(data);
    } catch (error: any) {
      console.error('Error fetching graph data:', error);
      throw new Error(`Failed to fetch graph data: ${error.message}`);
    }
  }

  // Process Neo4j data into graph format
  private async processNeo4jData(data: any): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }> {
    console.log("Progress - processing neo4j data");
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const nodeTypes = new Set<string>();

    // Split data into chunks for parallel processing
    const rows = data.results[0].data;
    const chunkSize = Math.ceil(rows.length / 4);
    const chunks = [];
    
    for (let i = 0; i < rows.length; i += chunkSize) {
      chunks.push(rows.slice(i, i + chunkSize));
    }

    // Process chunks in parallel using workers
    const workerPromises = chunks.map(chunk => {
      return new Promise<{ nodesData: any[], edgesData: any[] }>((resolve, reject) => {
        const worker = new Worker(new URL('./neo4j-worker.ts', import.meta.url));

        worker.onmessage = (e) => {
          resolve(e.data);
          worker.terminate();
        };

        worker.onerror = (error) => {
          console.error('Worker error:', error);
          reject(error);
          worker.terminate();
        };

        worker.postMessage(chunk);
      });
    });

    try {
      // Wait for all workers to complete
      const results = await Promise.all(workerPromises);
      
      // Combine results from all workers
      results.forEach(result => {
        result.nodesData.forEach((n: any) => {
          if (!nodes.has(n.id)) {
            nodeTypes.add(n.type);
            nodes.set(n.id, n);
          }
        });
        edges.push(...result.edgesData);
      });

      return {
        nodes: Array.from(nodes.values()),
        edges: edges
      };
    } catch (error) {
      console.error('Error processing data with workers:', error);
      throw error;
    }
  }

  // Convert Neo4j data directly to D3 format
  async getD3GraphData(nodes: GraphNode[], edges: GraphEdge[]): Promise<{ nodes: any[], edges: any[] }> {
    console.log("Progress - formatting d3 graph data");

    // Format nodes for D3
    const d3Nodes = nodes.map(node => ({
      id: node.id,
      data: {
        label: node.properties.displayName,
        type: node.type,
        properties: node.properties,
      },
      style: {
        x: node.x,
        y: node.y,
        labelFontSize: 20,
        labelText: node.properties.displayName,
        stroke: "#fff",
        lineWidth: 1
      },
    }));

    // Format edges for D3
    const d3Edges = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: {
        type: edge.type,
        properties: edge.properties,
        label: edge.type,
      },
      style: {
        label: false,
        labelText: edge.type,
        labelBackground: true,
        stroke: "#0569f4",
        lineWidth: 4,
      },
      state: {
        active: {
          label: true,
        },
      },
    }));

    console.log("Progress - done formatting d3 graph data");

    return {
      nodes: d3Nodes,
      edges: d3Edges
    };
  }

  // Get nodes and relationships matching a search query
  async searchGraph(query: string): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }> {
    if (!query || query.trim() === '') {
      return this.getGraphData();
    }
    await this.connect();
    console.log("connected to neo4j");
    const session = this.getSession();
    
    try {
      // Case-insensitive search across node properties
      const nodesResult = await session.run(`
        MATCH (n)
        WHERE any(prop IN keys(n) WHERE toString(n[prop]) CONTAINS $query)
        RETURN n
      `, { query });
      
      const nodes: GraphNode[] = nodesResult.records.map(record => 
        this.nodeToGraphNode(record)
      );
      
      const nodeIds = nodes.map(node => node.id);
      
      // Get relationships between the matched nodes
      const edgesResult = await session.run(`
        MATCH (source)-[r]->(target)
        WHERE id(source) IN $nodeIds OR id(target) IN $nodeIds
        RETURN source, r, target
      `, { nodeIds: nodeIds.map(id => parseInt(id)) });
      
      const edges: GraphEdge[] = edgesResult.records.map(record => 
        this.relationToGraphEdge(record)
      );
      
      // Add any missing nodes (nodes connected to our search results)
      const allNodesMap = new Map<string, GraphNode>();
      
      // Add initially matched nodes
      nodes.forEach(node => {
        allNodesMap.set(node.id, node);
      });
      
      // Add any additional nodes from relationships
      for (const edge of edges) {
        if (!allNodesMap.has(edge.source.id)) {
          // Need to fetch this node
          const sourceNodeResult = await session.run(`
            MATCH (n)
            WHERE id(n) = $nodeId
            RETURN n
          `, { nodeId: parseInt(edge.source.id) });
          
          if (sourceNodeResult.records.length > 0) {
            const sourceNode = this.nodeToGraphNode(sourceNodeResult.records[0]);
            allNodesMap.set(sourceNode.id, sourceNode);
          }
        }
        
        if (!allNodesMap.has(edge.target.id)) {
          // Need to fetch this node
          const targetNodeResult = await session.run(`
            MATCH (n)
            WHERE id(n) = $nodeId
            RETURN n
          `, { nodeId: parseInt(edge.target.id) });
          
          if (targetNodeResult.records.length > 0) {
            const targetNode = this.nodeToGraphNode(targetNodeResult.records[0]);
            allNodesMap.set(targetNode.id, targetNode);
          }
        }
      }
      
      const allNodes = Array.from(allNodesMap.values());
      
      return { 
        nodes: allNodes,
        edges
      };
    } finally {
      await session.close();
    }
  }
}

// Export singleton instance
const neo4jService = new Neo4jService();
export default neo4jService;
