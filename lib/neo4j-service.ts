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
  private processNeo4jData(data: any): { nodes: GraphNode[], edges: GraphEdge[] } {
    console.log("Progress - processing neo4j data");
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const nodeTypes = new Set<string>();

    data.results[0].data.forEach((row: any) => {
      // Process nodes
      if (row.graph.nodes) {
        row.graph.nodes.forEach((node: any) => {
          if (!nodes.has(node.id)) {
            const type = node.labels[0];
            nodeTypes.add(type);
            nodes.set(node.id, {
              id: node.id,
              label: node.properties.displayName || node.id,
              type: type,
              properties: node.properties,
              x: 0,
              y: 0
            });
          }
        });
      }

      // Process relationships
      if (row.graph.relationships) {
        row.graph.relationships.forEach((rel: any) => {
          edges.push({
            id: rel.id,
            source: rel.startNode,
            target: rel.endNode,
            type: rel.type,
            properties: rel.properties
          });
        });
      }
    });

    // Position nodes based on their connections
    this.assignNodePositions(Array.from(nodes.values()), edges);

    return {
      nodes: Array.from(nodes.values()),
      edges: edges
    };
  }

  // Convert Neo4j data directly to D3 format
  async getD3GraphData(nodes: GraphNode[], edges: GraphEdge[]): Promise<{ nodes: any[], edges: any[] }> {
    console.log("Progress - formatting d3 graph data");
    // Generate random colors for each unique node type
    const nodeTypes = Array.from(new Set(nodes.map(node => node.type)));
    const typeColors = new Map<string, string>();
    
    // Assign a random vibrant color to each node type
    nodeTypes.forEach(type => {
      const hue = Math.floor(Math.random() * 360); // Random hue (0-359)
      const saturation = 70 + Math.floor(Math.random() * 30); // High saturation (70-99%)
      const lightness = 45 + Math.floor(Math.random() * 15); // Medium lightness (45-59%)
      typeColors.set(type, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    });

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
        fill: typeColors.get(node.type) || "#6B7280",
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

  // Assign positions to nodes based on their relationships and edge weights
  private assignNodePositions(nodes: GraphNode[], edges: GraphEdge[]): void {
    // Calculate node degrees (number of connections)
    const nodeDegrees = new Map<string, number>();
    const nodeConnections = new Map<string, Set<string>>();
    
    // Initialize node connections and count degrees
    nodes.forEach(node => {
      nodeDegrees.set(node.id, 0);
      nodeConnections.set(node.id, new Set());
    });

    // Count connections for each node
    edges.forEach(edge => {
      // Increment degree for source and target
      nodeDegrees.set(edge.source.id, (nodeDegrees.get(edge.source.id) || 0) + 1);
      nodeDegrees.set(edge.target.id, (nodeDegrees.get(edge.target.id) || 0) + 1);
      
      // Track which nodes are connected to each other
      const sourceConnections = nodeConnections.get(edge.source.id) || new Set<string>();
      const targetConnections = nodeConnections.get(edge.target.id) || new Set<string>();
      
      sourceConnections.add(edge.target.id);
      targetConnections.add(edge.source.id);
      
      nodeConnections.set(edge.source.id, sourceConnections);
      nodeConnections.set(edge.target.id, targetConnections);
    });
    
    // Calculate center of the graph area
    const centerX = 800;
    const centerY = 600;
    const radius = 800; // Increased from 650 for even more initial spacing
    
    // Position nodes with higher degree closer to the center
    const maxDegree = Math.max(...Array.from(nodeDegrees.values()), 1);
    
    // Create an initial layout with connected nodes positioned near each other
    nodes.forEach(node => {
      const degree = nodeDegrees.get(node.id) || 0;
      // Nodes with more connections are placed closer to center
      const normalizedDegree = degree / maxDegree;
      const nodeRadius = radius * (1 - (normalizedDegree * 0.7)); // Higher degree = closer to center
      
      // Calculate angle based on node ID for initial distribution
      const angle = parseInt(node.id, 10) % 360 * (Math.PI / 180);
      
      node.x = centerX + nodeRadius * Math.cos(angle);
      node.y = centerY + nodeRadius * Math.sin(angle);
    });
    
    // Apply force-directed algorithm iterations to refine positions
    this.applyForceDirectedLayout(nodes, edges, nodeConnections, 20);
  }

  // Apply force-directed layout algorithm
  private applyForceDirectedLayout(
    nodes: GraphNode[], 
    edges: GraphEdge[], 
    nodeConnections: Map<string, Set<string>>,
    iterations: number
  ): void {
    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Constants for the force-directed algorithm
    const repulsionForce = 25000; // Force pushing nodes apart
    const attractionForce = 0.2;  // Force pulling connected nodes together
    const maxMovement = 50;       // Limit node movement per iteration
    const minDistance = 100;      // Minimum distance between nodes in pixels
    
    for (let iter = 0; iter < iterations; iter++) {
      // Each node gets a displacement vector
      const displacements = new Map<string, {dx: number, dy: number}>();
      nodes.forEach(node => displacements.set(node.id, {dx: 0, dy: 0}));
      
      // Calculate repulsion forces (nodes push each other away)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          
          const dx = node2.x - node1.x;
          const dy = node2.y - node1.y;
          
          // Avoid division by zero and very small distances
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // If nodes are closer than the minimum distance, apply a stronger repulsion force
          if (distance < minDistance) {
            // Calculate a normalized direction vector
            const nx = dx / (distance || 1);
            const ny = dy / (distance || 1);
            
            // Apply a direct displacement to maintain minimum distance
            const moveDistance = (minDistance - distance) / 2;
            
            const disp1 = displacements.get(node1.id)!;
            const disp2 = displacements.get(node2.id)!;
            
            disp1.dx -= nx * moveDistance;
            disp1.dy -= ny * moveDistance;
            disp2.dx += nx * moveDistance;
            disp2.dy += ny * moveDistance;
          } else {
            // Regular repulsion force for nodes that are already far enough apart
            // Repulsion force is inversely proportional to distance
            const force = repulsionForce / (distance * distance);
            
            const disp1 = displacements.get(node1.id)!;
            const disp2 = displacements.get(node2.id)!;
            
            // Apply force along the displacement vector
            disp1.dx -= (dx / distance) * force;
            disp1.dy -= (dy / distance) * force;
            disp2.dx += (dx / distance) * force;
            disp2.dy += (dy / distance) * force;
          }
        }
      }
      
      // Calculate attraction forces (connected nodes pull each other closer)
      edges.forEach(edge => {
        const sourceNode = nodeMap.get(edge.source.id);
        const targetNode = nodeMap.get(edge.target.id);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          
          // Avoid division by zero
          const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          
          // Edge weight factor - the more properties/weight, the stronger the attraction
          const edgeWeight = Object.keys(edge.properties).length + 1;
          
          // Attraction force is proportional to distance and edge weight
          const force = distance * attractionForce * edgeWeight;
          
          const dispSource = displacements.get(edge.source.id)!;
          const dispTarget = displacements.get(edge.target.id)!;
          
          // Apply force along the displacement vector
          dispSource.dx += (dx / distance) * force;
          dispSource.dy += (dy / distance) * force;
          dispTarget.dx -= (dx / distance) * force;
          dispTarget.dy -= (dy / distance) * force;
        }
      });
      
      // Apply displacements and limit maximum movement
      nodes.forEach(node => {
        const disp = displacements.get(node.id)!;
        
        // Calculate displacement magnitude
        const magnitude = Math.sqrt(disp.dx * disp.dx + disp.dy * disp.dy);
        
        if (magnitude > 0) {
          // Limit movement to maxMovement
          const limitedMagnitude = Math.min(magnitude, maxMovement);
          
          // Apply the limited displacement
          node.x += disp.dx * (limitedMagnitude / magnitude);
          node.y += disp.dy * (limitedMagnitude / magnitude);
        }
      });
      
      // Final pass to ensure no nodes are overlapping (enforce minimum distance)
      this.resolveNodeOverlaps(nodes, minDistance);
    }
  }
  
  // Resolve any remaining node overlaps after force-directed layout
  private resolveNodeOverlaps(nodes: GraphNode[], minDistance: number): void {
    let overlapsResolved = false;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    
    while (!overlapsResolved && iterations < maxIterations) {
      overlapsResolved = true;
      iterations++;
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          
          const dx = node2.x - node1.x;
          const dy = node2.y - node1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // If nodes are still too close, move them apart
          if (distance < minDistance) {
            overlapsResolved = false;
            
            // Calculate normalized direction vector
            const nx = dx / (distance || 1);
            const ny = dy / (distance || 1);
            
            // Amount to move each node (half the difference to reach minimum distance)
            const moveAmount = (minDistance - distance) / 2;
            
            // Move nodes directly away from each other
            node1.x -= nx * moveAmount;
            node1.y -= ny * moveAmount;
            node2.x += nx * moveAmount;
            node2.y += ny * moveAmount;
          }
        }
      }
    }
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
      
      // Position nodes based on their connections
      this.assignNodePositions(allNodes, edges);
      
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
