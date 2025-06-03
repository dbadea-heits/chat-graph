self.onmessage = (e) => {
    const rows = e.data;
    const nodesData: any[] = [];
    const edgesData: any[] = [];
  
    rows.forEach((row: any) => {
      if (row.graph.nodes) {
        row.graph.nodes.forEach((node: any) => {
          nodesData.push({
            id: node.id,
            label: node.properties.displayName || node.id,
            type: node.labels[0],
            properties: node.properties
          });
        });
      }
  
      if (row.graph.relationships) {
        row.graph.relationships.forEach((rel: any) => {
          edgesData.push({
            id: rel.id,
            source: rel.startNode,
            target: rel.endNode,
            type: rel.type,
            properties: rel.properties
          });
        });
      }
    });
  
    self.postMessage({ nodesData, edgesData });
  };
  