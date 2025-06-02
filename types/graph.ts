export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}
