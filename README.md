# PulseBench

A simple API load-testing platform: create projects, add endpoints, run configurable
load tests, and watch results stream in live over WebSockets. Includes Kubernetes
cluster monitoring via Prometheus and a rule-based recommendation after each test.

See `ARCHITECTURE.md` for the full design (schema, API, sockets, Docker, K8s, milestone plan).

## Run locally (Docker Compose)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Postgres: localhost:5432

Run the first Prisma migration once Postgres is up:

```bash
docker compose exec backend npx prisma migrate dev --name init --schema=src/prisma/schema.prisma
```

## Run locally (without Docker)

```bash
# backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init --schema=src/prisma/schema.prisma
npm run dev

# frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Deploy to Kubernetes

```bash
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/prometheus.yaml
```

Replace `<YOUR_DOCKERHUB_USERNAME>` in `k8s/backend.yaml` and `k8s/frontend.yaml`
with your pushed image names first.

## Stack

React + TS + Tailwind + Recharts · Node + Express + TS + Socket.IO · PostgreSQL + Prisma
· Docker + Docker Compose · Kubernetes · Prometheus · GitHub Actions
