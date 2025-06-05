// Neo4j database connection configuration

const getConfig = () => {
  const uri = process.env.NEO4J_URI;
  const httpUri = process.env.NEO4J_HTTP_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !httpUri || !username || !password) {
    throw new Error(`Missing required Neo4j environment variables: ${[
      !uri && 'NEO4J_URI',
      !httpUri && 'NEO4J_HTTP_URI', 
      !username && 'NEO4J_USERNAME',
      !password && 'NEO4J_PASSWORD'
    ].filter(Boolean).join(', ')}`);
  }

  return {
    uri,
    httpUri,
    username,
    password,
  };
};

export const neo4jConfig = getConfig();
