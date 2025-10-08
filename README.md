# Chat Graph

A Next.js application for visualizing and interacting with graph data using Neo4j.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Development](#development)
- [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)

## Overview

Chat Graph is a Next.js application that provides an interactive interface for visualizing and querying graph data stored in a Neo4j database. It features:

- Graph visualization
- Chat interface for interacting with graph data
- Data visualization components
- Integration with Neo4j

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/en/) (v20 or later)
- [pnpm](https://pnpm.io/) (v10.8.1 or later)
- [Neo4j](https://neo4j.com/download/) (for local development)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/dbadea-heits/chat-graph.git
cd chat-graph
```

2. Install dependencies:

```bash
pnpm install
```

## Environment Variables

Create a `.env` file in the root directory following `.env.sampme`:

Adjust these values according to your setup.

## Running the Application

### Development Mode

To run the application in development mode:

```bash
pnpm dev
```

This will start the application on [http://localhost:3000](http://localhost:3000).

### Production Build

To build the application for production:

```bash
pnpm build
```

To start the production server:

```bash
pnpm start
```

### Linting

To lint the codebase:

```bash
pnpm lint
```

## Project Structure

```
chat-graph/
├── app/                   # Next.js application directory
├── components/            # React components
│   └── ui/                # UI components
├── constants/             # Application constants
├── docs/                  # Documentation
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and services
├── public/                # Static files
├── scripts/               # Utility scripts
├── styles/                # CSS stylesheets
└── types/                 # TypeScript types
```

### Key Components

- `components/chat-interface.tsx`: Chat interaction interface
- `components/graph-visualization.tsx`: Graph visualization component
- `components/dashboard.tsx`: Dashboard for data visualization
- `lib/neo4j-service.ts`: Service for Neo4j database interactions
- `hooks/use-neo4j-graph.ts`: Hook for working with Neo4j graph data
