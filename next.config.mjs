/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  env: {
    API_BASE_URL: process.env.API_BASE_URL,
    FILTER_GRAPH_ENDPOINT: process.env.FILTER_GRAPH_ENDPOINT,
    UPDATE_NEO4J_ENDPOINT: process.env.UPDATE_NEO4J_ENDPOINT,
    CONSOLIDATE_NODES_ENDPOINT: process.env.CONSOLIDATE_NODES_ENDPOINT,
    JOB_STATUS_ENDPOINT: process.env.JOB_STATUS_ENDPOINT,
    LIST_IDS_ENDPOINT: process.env.LIST_IDS_ENDPOINT,
    ASK_RAG_ENDPOINT: process.env.ASK_RAG_ENDPOINT,
    NEO4J_URI: process.env.NEO4J_URI,
    NEO4J_HTTP_URI: process.env.NEO4J_HTTP_URI,
    NEO4J_USERNAME: process.env.NEO4J_USERNAME,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
  },
}

export default nextConfig
