# Use Node.js LTS version
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

ENV API_BASE_URL=http://52.90.62.170:8000
ENV FILTER_GRAPH_ENDPOINT=/filter-graph
ENV JOB_STATUS_ENDPOINT=/job-status
ENV UPDATE_NEO4J_ENDPOINT=/update-neo4j
ENV ASK_RAG_ENDPOINT=/ask-rag
ENV LIST_IDS_ENDPOINT=/node-ids

ENV NEO4J_URI=neo4j://52.205.164.222:7687
ENV NEO4J_HTTP_URI=http://52.205.164.222:7474
ENV NEO4J_USERNAME=neo4j
ENV NEO4J_PASSWORD=password

# Build the application
RUN pnpm build

# Set production environment
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"] 
