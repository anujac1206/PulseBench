import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// GET /api/projects - list the logged-in user's projects
router.get('/', async (req: AuthRequest, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.userId },
    include: { endpoints: true },
  });
  res.json(projects);
});

// POST /api/projects - create a project
router.post('/', async (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const project = await prisma.project.create({
    data: { name, userId: req.userId as string },
  });
  res.json(project);
});

// GET /api/projects/:id - project + endpoints + test history
router.get('/:id', async (req: AuthRequest, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: {
      endpoints: {
        include: {
          testRuns: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// POST /api/projects/:id/endpoints - add an endpoint to a project
router.post('/:id/endpoints', async (req: AuthRequest, res) => {
  const { name, url, method } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url are required' });

  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const endpoint = await prisma.endpoint.create({
    data: { name, url, method: method || 'GET', projectId: project.id },
  });
  res.json(endpoint);
});

export default router;
