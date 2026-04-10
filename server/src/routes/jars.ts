import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { requireAuth, type AuthRequest } from '../middleware/auth'

export const jarsRouter = Router()
jarsRouter.use(requireAuth)

const JAR_INCLUDE = { members: true } as const

type JarWithMembers = Prisma.JarGetPayload<{ include: { members: true } }>

// Serialize a Prisma Jar row into the shape the frontend StorageAdapter expects.
function serializeJar(jar: JarWithMembers) {
  return {
    id: jar.id,
    name: jar.name,
    ownerId: jar.ownerId,
    memberIds: jar.members.map((m) => m.userId),
    amountPerComplaint: jar.amountPerComplaint,
    currency: jar.currency,
    createdAt: jar.createdAt.toISOString(),
    bustedAt: jar.bustedAt?.toISOString(),
  }
}

// Guard: returns the jar only if the requesting user is a member.
async function getJarForMember(jarId: string, userId: string) {
  const jar = await prisma.jar.findUnique({ where: { id: jarId }, include: JAR_INCLUDE })
  if (!jar || !jar.members.some((m) => m.userId === userId)) return null
  return jar
}

// GET /api/jars — list all jars the requesting user is a member of, newest first.
jarsRouter.get('/', async (req: AuthRequest, res) => {
  const memberships = await prisma.jarMember.findMany({
    where: { userId: req.userId! },
    include: { jar: { include: JAR_INCLUDE } },
    orderBy: { jar: { createdAt: 'desc' } },
  })
  res.json(memberships.map((m) => serializeJar(m.jar)))
})

// POST /api/jars — create a jar; creator is automatically the owner and first member.
jarsRouter.post('/', async (req: AuthRequest, res) => {
  const { name, amountPerComplaint = 100, currency = 'USD' } = req.body as {
    name?: string
    amountPerComplaint?: number
    currency?: string
  }
  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const jar = await prisma.jar.create({
    data: {
      name,
      ownerId: req.userId!,
      amountPerComplaint,
      currency,
      members: { create: { userId: req.userId! } },
    },
    include: JAR_INCLUDE,
  })
  res.status(201).json(serializeJar(jar))
})

// GET /api/jars/:id
jarsRouter.get('/:id', async (req: AuthRequest, res) => {
  const jar = await getJarForMember(req.params.id, req.userId!)
  if (!jar) {
    res.status(404).json({ error: 'Jar not found' })
    return
  }
  res.json(serializeJar(jar))
})

// PUT /api/jars/:id — update name and/or amountPerComplaint.
jarsRouter.put('/:id', async (req: AuthRequest, res) => {
  const jar = await getJarForMember(req.params.id, req.userId!)
  if (!jar) {
    res.status(404).json({ error: 'Jar not found' })
    return
  }
  const { name, amountPerComplaint } = req.body as {
    name?: string
    amountPerComplaint?: number
  }
  const updated = await prisma.jar.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(amountPerComplaint !== undefined && { amountPerComplaint }),
    },
    include: JAR_INCLUDE,
  })
  res.json(serializeJar(updated))
})

// POST /api/jars/:id/bust — atomically clears complaints and stamps bustedAt.
jarsRouter.post('/:id/bust', async (req: AuthRequest, res) => {
  const jar = await getJarForMember(req.params.id, req.userId!)
  if (!jar) {
    res.status(404).json({ error: 'Jar not found' })
    return
  }
  const [, updated] = await prisma.$transaction([
    prisma.complaint.deleteMany({ where: { jarId: req.params.id } }),
    prisma.jar.update({
      where: { id: req.params.id },
      data: { bustedAt: new Date() },
      include: JAR_INCLUDE,
    }),
  ])
  res.json(serializeJar(updated))
})

// POST /api/jars/:id/members — invite a user by their userId (owner only).
jarsRouter.post('/:id/members', async (req: AuthRequest, res) => {
  const jar = await prisma.jar.findUnique({ where: { id: req.params.id }, include: JAR_INCLUDE })
  if (!jar || jar.ownerId !== req.userId) {
    res.status(404).json({ error: 'Jar not found or not owner' })
    return
  }
  const { userId } = req.body as { userId?: string }
  if (!userId) {
    res.status(400).json({ error: 'userId is required' })
    return
  }
  try {
    await prisma.jarMember.create({ data: { jarId: req.params.id, userId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: 'User is already a member of this jar' })
      return
    }
    throw e
  }
  const updated = await prisma.jar.findUniqueOrThrow({
    where: { id: req.params.id },
    include: JAR_INCLUDE,
  })
  res.json(serializeJar(updated))
})
