import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, type AuthRequest } from '../middleware/auth'

// mergeParams: true so req.params.jarId from the parent route is accessible.
export const complaintsRouter = Router({ mergeParams: true })
complaintsRouter.use(requireAuth)

type ComplaintRow = Awaited<ReturnType<typeof prisma.complaint.findUniqueOrThrow>>

// Serialize to the shape the frontend Complaint type expects.
function serializeComplaint(c: ComplaintRow) {
  return {
    id: c.id,
    jarId: c.jarId,
    userId: c.userId,
    note: c.note ?? undefined,
    amount: c.amount,
    createdAt: c.createdAt.toISOString(),
  }
}

async function isMember(jarId: string, userId: string): Promise<boolean> {
  const row = await prisma.jarMember.findUnique({
    where: { jarId_userId: { jarId, userId } },
  })
  return row !== null
}

// GET /api/jars/:jarId/complaints — returns complaints newest-first.
complaintsRouter.get('/', async (req: AuthRequest, res) => {
  if (!(await isMember(req.params.jarId, req.userId!))) {
    res.status(404).json({ error: 'Jar not found' })
    return
  }
  const complaints = await prisma.complaint.findMany({
    where: { jarId: req.params.jarId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(complaints.map(serializeComplaint))
})

// POST /api/jars/:jarId/complaints — adds a complaint.
// Amount is snapshotted from the jar's current amountPerComplaint so that
// changing the setting later doesn't retroactively alter history.
complaintsRouter.post('/', async (req: AuthRequest, res) => {
  if (!(await isMember(req.params.jarId, req.userId!))) {
    res.status(404).json({ error: 'Jar not found' })
    return
  }
  const { note } = req.body as { note?: string }
  const jar = await prisma.jar.findUniqueOrThrow({ where: { id: req.params.jarId } })
  const complaint = await prisma.complaint.create({
    data: {
      jarId: req.params.jarId,
      userId: req.userId!,
      note: note?.trim() || null,
      amount: jar.amountPerComplaint,
    },
  })
  res.status(201).json(serializeComplaint(complaint))
})
