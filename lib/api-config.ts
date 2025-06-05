// API endpoints configuration

const getConfig = () => {
  const baseUrl = process.env.API_BASE_URL;
  const filterGraphEndpoint = process.env.FILTER_GRAPH_ENDPOINT;
  const updateNeo4jEndpoint = process.env.UPDATE_NEO4J_ENDPOINT;
  const jobStatusEndpoint = process.env.JOB_STATUS_ENDPOINT;
  const nodeIdsEndpoint = process.env.LIST_IDS_ENDPOINT;
  const askRagEndpoint = process.env.ASK_RAG_ENDPOINT;

  if (!baseUrl || !filterGraphEndpoint || !updateNeo4jEndpoint || 
      !jobStatusEndpoint || !nodeIdsEndpoint || !askRagEndpoint) {
    throw new Error(`Missing required API environment variables: ${[
      !baseUrl && 'API_BASE_URL',
      !filterGraphEndpoint && 'FILTER_GRAPH_ENDPOINT',
      !updateNeo4jEndpoint && 'UPDATE_NEO4J_ENDPOINT',
      !jobStatusEndpoint && 'JOB_STATUS_ENDPOINT',
      !nodeIdsEndpoint && 'LIST_IDS_ENDPOINT',
      !askRagEndpoint && 'ASK_RAG_ENDPOINT'
    ].filter(Boolean).join(', ')}`);
  }

  return {
    baseUrl,
    filterGraphEndpoint,
    updateNeo4jEndpoint,
    jobStatusEndpoint,
    nodeIdsEndpoint,
    askRagEndpoint,
  } as const;
};

export const apiConfig = getConfig(); 
