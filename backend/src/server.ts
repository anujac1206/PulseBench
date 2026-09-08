import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import client from 'prom-client';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import clusterRoutes from './routes/cluster';
import { createTestRoutes } from './routes/tests';
import { verifyToken } from './middleware/auth';
import { setupWebsocket } from './websocket';

const app = express();
const httpServer = createServer(app);
const io = setupWebsocket(httpServer);

app.use(cors());
app.use(express.json());

// --- Prometheus metrics (inline, no separate module) ---
client.collectDefaultMetrics();
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
});
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, path: req.path, status: res.statusCode });
  });
  next();
});
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// --- Health check ---
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/projects', verifyToken, projectRoutes);
app.use('/api/tests', verifyToken, createTestRoutes(io));
app.use('/api/cluster', verifyToken, clusterRoutes);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`PulseBench backend running on port ${PORT}`);
});
