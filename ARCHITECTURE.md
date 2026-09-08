# PulseBench — Complete Simple Architecture (5-Day Solo Build)

Everything trimmed to what a single person can actually build, understand fully, and explain in an interview. Nothing below exists "for completeness" — if it wasn't clearly pulling weight, it's gone.

---

## 1. System Architecture

```
      Browser (React + TS + Tailwind + Recharts)
                    │
        REST (fetch)│  WebSocket (Socket.IO)
                    ▼
        Node + Express + TypeScript API
        (one process — auth, projects, endpoints,
         load test engine, recommendation logic,
         cluster queries)
                    │
         ┌──────────┼───────────┐
         ▼                      ▼
   PostgreSQL (Prisma)     Prometheus
   4 tables                (scrapes API /metrics
                             + k8s pod metrics)

   Everything runs in Docker → deployed to Kubernetes
   GitHub Actions builds + pushes images on push to main
```

---

## 2. Folder Structure

**Backend — 8 files**
```
backend/
  src/
    routes/
      auth.ts       # register, login — bcrypt + jwt inline
      projects.ts    # projects + endpoints (create/list)
      tests.ts        # run test, get test — load test engine + recommendation rules
      cluster.ts       # GET /cluster — queries Prometheus
    middleware/
      auth.ts           # one function: verifyToken
    websocket.ts           # Socket.IO setup, 3 events
    prisma/
      schema.prisma
    server.ts               # Express app, mounts routes, starts Socket.IO
  Dockerfile
  package.json
```

**Frontend — 8 files** (down from 15+)
```
frontend/
  src/
    pages/
      LoginPage.tsx     # login + register toggled in one form
      DashboardPage.tsx  # project list + create project + ClusterMonitor
      ProjectPage.tsx      # endpoints + run-test form + live chart + history, all one page
    components/
      Navbar.tsx
      LiveChart.tsx          # Recharts line, fed by socket ticks
      ClusterMonitor.tsx       # 3 stat cards (CPU/mem/pods), self-polling
    services/
      client.ts                 # fetch wrapper + socket instance, one file
    App.tsx
  Dockerfile
  package.json
```

What got merged and why:
- **Login + Register → one page.** A toggle link switches the form mode; it's the same 3 fields either way, no reason for two files.
- **`LoadTestPage` folded into `ProjectPage`.** Running a test and viewing its live chart happens right where you already are — you picked the endpoint and clicked "Run" from that page, so showing the live chart inline (below the form) avoids a navigation and a page that only exists for a few seconds of interaction.
- **`ProjectCard`, `EndpointForm`, `TestConfigForm`, `TestHistoryTable` → inlined directly in their pages** as plain JSX (a `<form>`, a `.map()` over an array, a `<table>`). None of these have logic worth isolating — they're each under ~15 lines. Only pull a piece into its own component if you're reusing it in two places; none of these are.
- **`api.ts` + `socket.ts` → one `client.ts`.** Both are just "talk to the backend" — a fetch helper and a socket instance living in the same file is easier to open once and see the whole client-side data layer.

---

## 3. Authentication (JWT + bcrypt only)

`routes/auth.ts` + `middleware/auth.ts`, nothing else.

```
POST /api/auth/register   { email, password, name } → hash, create user, sign token
POST /api/auth/login      { email, password }        → compare hash, sign token
```

Single 7-day JWT, `{ userId }` payload, stored in `localStorage`. No refresh tokens, roles, OAuth, email verification, password reset, `/me`, or `/logout`.

---

## 4. Database Schema (Prisma) — 4 Tables, minimum fields

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  name         String
  projects     Project[]
}

model Project {
  id        String     @id @default(uuid())
  name      String
  userId    String
  user      User       @relation(fields: [userId], references: [id])
  endpoints Endpoint[]
}

model Endpoint {
  id        String     @id @default(uuid())
  projectId String
  project   Project    @relation(fields: [projectId], references: [id])
  name      String
  url       String
  method    String     @default("GET")
  testRuns  TestRun[]
}

model TestRun {
  id              String    @id @default(uuid())
  endpointId      String
  endpoint        Endpoint  @relation(fields: [endpointId], references: [id])

  numRequests     Int
  requestsPerSec  Int
  pattern         String    // "constant" | "ramp" | "spike"
  status          String    @default("running")

  totalRequests   Int?
  successRequests Int?
  failedRequests  Int?
  avgLatencyMs    Float?
  p95LatencyMs    Float?
  recommendation  String?

  createdAt       DateTime  @default(now())
}

```

Dropped every `createdAt`/`updatedAt` field that wasn't actually displayed anywhere (kept only on `TestRun`, where you need it to sort history). Fewer timestamps to wire up, nothing lost — you weren't building an audit trail.

---

## 5. REST API Endpoints

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login

Projects
  GET    /api/projects
  POST   /api/projects
  GET    /api/projects/:id           → includes endpoints + test history
  POST   /api/projects/:id/endpoints

Test Runs
  POST   /api/tests
  GET    /api/tests/:id

Cluster
  GET    /api/cluster

Health
  GET    /health
```

10 endpoints, unchanged — this was already minimal. Everything but `/auth/*` and `/health` sits behind JWT middleware, mounted once in `server.ts`.

---

## 6. WebSocket Events

One room per test, three events, all in `websocket.ts`:

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `join_test` | `testId` |
| Server → Client | `test_tick` | `{ totalRequests, successRequests, failedRequests, avgLatencyMs, p95LatencyMs }` |
| Server → Client | `test_complete` | `{ ...same fields, recommendation }` |

---

## 7. Docker Architecture

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: [POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD]
    volumes: [pgdata:/var/lib/postgresql/data]

  backend:
    build: ./backend
    depends_on: [postgres]
    environment: [DATABASE_URL, JWT_SECRET]
    ports: ["4000:4000"]

  frontend:
    build: ./frontend
    depends_on: [backend]
    ports: ["3000:3000"]
```

- `backend/Dockerfile`: single-stage `node:20-alpine`, `npm install && npm run build`, `CMD ["node", "dist/server.js"]`.
- `frontend/Dockerfile`: `npm run build`, then `npx serve -s dist -l 3000` — no nginx config.
- Prometheus only runs inside Kubernetes, not in Compose.

---

## 8. Kubernetes Architecture — 5 files

One file per component, Deployment + Service combined with `---` in the same YAML file (a very common, perfectly idiomatic pattern — no reason to split what you always edit and apply together):

```
Namespace: pulsebench
│
├── postgres.yaml     (Deployment + PVC + Service)
├── backend.yaml       (Deployment + Service, readiness probe → /health)
├── frontend.yaml        (Deployment + Service)
├── secret.yaml             (DATABASE_URL, JWT_SECRET, POSTGRES_PASSWORD)
└── prometheus.yaml           (Deployment + Service + ClusterRole/RoleBinding)
```

No StatefulSet, no Ingress, no Helm, 1 replica everywhere, 4 pods total. This is the smallest set of files that still proves you can deploy a multi-service stateful app to a real cluster with health checks and RBAC.

---

## 9. Communication Flow

**Load test run:**
1. On `ProjectPage`, submitting the run-test form → `POST /api/tests` → `routes/tests.ts` creates a `TestRun`, returns `{ testId }` immediately, starts the async firing loop in the background.
2. Frontend emits `join_test`; `LiveChart` (already rendered inline on the same page) starts listening.
3. Every 1s, `test_tick` updates the chart.
4. On completion, `test_complete` delivers the final numbers + recommendation; the page's history list (a plain re-fetch of `GET /api/projects/:id`) now includes it.

**Cluster monitoring:** `ClusterMonitor` on `DashboardPage` polls `GET /api/cluster` every ~5s via `setInterval` — a separate, simple loop, unrelated to the WebSocket layer.

**Auth:** JWT in `localStorage`, attached as `Authorization: Bearer` on every REST call via `client.ts`. Socket stays unauthenticated — `testId` is a UUID.

---

## 10. 5-Day Milestone Plan

**Day 1 — Setup + Auth**
Scaffold both folders, Prisma schema, Postgres in Compose. `routes/auth.ts` + `middleware/auth.ts`. `LoginPage` (toggle mode) wired up.
*Done when:* you can register and log in through the UI.

**Day 2 — Projects, Endpoints, Prometheus scaffolding**
`routes/projects.ts`. `DashboardPage` (create/list projects), `ProjectPage` (create/list endpoints). `prom-client` inline in `server.ts`, `/health` + `/metrics`.
*Done when:* you can create a project and add an endpoint through the UI.

**Day 3 — Load Test Engine + Live Dashboard**
`routes/tests.ts` (firing loop, constant pattern first, latency + P95, recommendation rules). `websocket.ts`. Inline run-test form + `LiveChart` on `ProjectPage`.
*Done when:* a test against `https://httpbin.org/get` shows a live-updating chart and a recommendation.

**Day 4 — Test History + Dockerize**
Confirm nested test runs come back from `GET /api/projects/:id`; render as an inline table on `ProjectPage`. Both Dockerfiles + `docker-compose.yml`; confirm `docker compose up` runs everything from a clean clone.
*Done when:* a stranger could clone the repo and run one command.

**Day 5 — Kubernetes + CI + README**
Write the 5 k8s files, deploy to minikube/kind, confirm probes pass and `GET /api/cluster` returns real numbers via `ClusterMonitor`. One `ci.yml` (install, lint, `tsc --noEmit`, build both images). README with diagram, setup steps, demo GIF.
*Done when:* repo, running app, and your ability to explain every file are all in sync.

---

### If short on time, cut in this order
1. Ramp/spike patterns → ship constant-only.
2. Live cluster deploy → a local kind/minikube recording is enough.
3. CI workflow → keep this last if possible; it's cheap and high-signal.
