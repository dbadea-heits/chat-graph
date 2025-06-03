// API endpoints configuration

export const apiConfig = {
    baseUrl: process.env.NEXT_API_BASE_URL || "http://localhost:8000",
    filterGraphEndpoint: process.env.NEXT_FILTER_GRAPH_ENDPOINT || "/filter-graph",
    updateNeo4jEndpoint: process.env.NEXT_UPDATE_NEO4J_ENDPOINT || "/update-neo4j",
    jobStatusEndpoint: process.env.NEXT_JOB_STATUS_ENDPOINT || "/job-status",
} as const; 