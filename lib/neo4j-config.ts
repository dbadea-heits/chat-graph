// Neo4j database connection configuration

export const neo4jConfig = {
  uri: process.env.NEXT_PUBLIC_NEO4J_URI || "neo4j://localhost:7687",
  httpUri: process.env.NEXT_PUBLIC_NEO4J_HTTP_URI || "http://localhost:7474",
  username: process.env.NEXT_PUBLIC_NEO4J_USERNAME || "neo4j",
  password: process.env.NEXT_PUBLIC_NEO4J_PASSWORD || "password",
};
