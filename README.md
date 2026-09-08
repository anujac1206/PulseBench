# PulseBench

A cloud-hosted API load testing and performance analytics platform built for developers to benchmark REST APIs, monitor response metrics, and compare historical test runs through a modern dashboard.

## Live Demo

Frontend: https://pulse-bench-pi.vercel.app

Backend: https://pulsebench-backend.onrender.com

---

## Overview

PulseBench enables developers to register API endpoints, execute configurable load tests, monitor performance metrics in real time, and analyze historical results.

The platform provides an intuitive dashboard for tracking latency, throughput, success rates, and performance trends across multiple test runs.

Unlike simple API testing tools, PulseBench stores historical telemetry and allows side-by-side comparison of previous load tests to identify performance regressions and improvements.

---

## Features

### Authentication & Security

- JWT-based authentication
- User registration and login
- Protected API routes
- Multi-user project isolation

### Endpoint Management

- Create and manage API endpoints
- Support for:
  - GET
  - POST
  - PUT
  - DELETE
- Organize endpoints by project

### Load Testing

Configure custom load tests with:

- Total request count
- Requests per second
- Constant load pattern
- Ramp-up traffic simulation
- Traffic spike simulation

### Real-Time Monitoring

- Live telemetry updates via WebSockets
- Active test monitoring
- Historical throughput tracking
- Live request statistics

### Performance Analytics

Track key metrics including:

- Success Rate
- Average Latency
- P95 Latency
- Throughput
- Request Volume
- Failure Count

### Historical Comparison

Compare multiple test runs and analyze:

- Response times
- Success percentages
- Load patterns
- Throughput performance
- Historical trends

### Persistent Storage

All users, projects, endpoints, and test results are stored in PostgreSQL using Prisma ORM.

---

## Architecture

```text
┌──────────────────────────┐
│      React Frontend      │
│   TypeScript + Vite      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│     Express Backend      │
│      TypeScript API      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│        Prisma ORM        │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Neon PostgreSQL DB     │
└──────────────────────────┘
```

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Socket.IO Client

### Backend

- Node.js
- Express.js
- TypeScript
- Socket.IO
- JWT Authentication

### Database

- PostgreSQL
- Neon Database
- Prisma ORM

### Infrastructure

- Docker
- Docker Compose
- Render
- Vercel
- GitHub Actions

---

## Example Workflow

### 1. Register

Create a new account using email and password.

### 2. Create Endpoint

Add an API endpoint such as:

```text
https://jsonplaceholder.typicode.com/posts
```

### 3. Configure Load Test

Choose:

- Total requests
- Requests per second
- Traffic pattern

### 4. Launch Test

PulseBench executes requests against the selected endpoint.

### 5. Monitor Results

Watch metrics stream live through the dashboard.

### 6. Analyze Performance

Review:

- Avg latency
- P95 latency
- Success rate
- Throughput

### 7. Compare Historical Runs

Compare previous benchmark runs to identify improvements or regressions.

---

## Database Schema

### User

```text
User
 ├── id
 ├── email
 ├── passwordHash
 ├── name
 └── projects
```

### Project

```text
Project
 ├── id
 ├── name
 ├── userId
 └── endpoints
```

### Endpoint

```text
Endpoint
 ├── id
 ├── name
 ├── url
 ├── method
 └── testRuns
```

### TestRun

```text
TestRun
 ├── numRequests
 ├── requestsPerSec
 ├── totalRequests
 ├── successRequests
 ├── failedRequests
 ├── avgLatencyMs
 ├── p95LatencyMs
 ├── recommendation
 └── createdAt
```

---

## Running Locally

### Clone Repository

```bash
git clone https://github.com/anujac1206/PulseBench.git
cd PulseBench
```

### Backend

```bash
cd backend

npm install

npx prisma generate

npx prisma db push --schema=src/prisma/schema.prisma

npm run dev
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Environment Variables

### Backend

```env
DATABASE_URL=your_neon_database_url

JWT_SECRET=your_secret_key

PORT=4000

PROMETHEUS_URL=http://localhost:9090
```

### Frontend

```env
VITE_API_URL=https://pulsebench-backend.onrender.com
```

---

## Current Capabilities

- User Authentication
- Endpoint Management
- Load Testing
- Historical Metrics
- Run Comparison
- Real-Time Dashboard
- Cloud Deployment
- Persistent Database Storage

---

## Future Improvements

- Distributed load generators
- Kubernetes deployment
- Prometheus integration
- Grafana dashboards
- CSV/PDF reporting
- AI-powered performance recommendations
- Advanced traffic simulation
- Team collaboration support
- API benchmarking leaderboards

---

## Screenshots

Add screenshots here:

### Dashboard

![Dashboard](docs/dashboard.png)

### Load Test Results

![Results](docs/results.png)

### Historical Comparison

![Comparison](docs/comparison.png)

---

## Resume Highlights

- Built a full-stack API load testing platform from scratch.
- Designed JWT-secured REST APIs with Express and TypeScript.
- Integrated Prisma ORM with Neon PostgreSQL.
- Implemented real-time telemetry updates using WebSockets.
- Containerized services using Docker.
- Deployed production infrastructure using Render and Vercel.
- Developed historical benchmarking and comparison analytics.

---

## Author

**Anuja Chaudhary**

GitHub: https://github.com/anujac1206
