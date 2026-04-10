// ─── Analysis route ───────────────────────────────────────────────────────────
// POST /api/jars/:id/analyze
//
// Fetches this jar's complaints from the DB, forwards them to the Python
// CrewAI microservice, and returns the insights report.
//
// The Python service URL defaults to http://localhost:8000 for local dev;
// set ANALYSIS_SERVICE_URL in .env to override in production.

import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, type AuthRequest } from '../middleware/auth'

export const analyzeRouter = Router({ mergeParams: true })
analyzeRouter.use(requireAuth)

const ANALYSIS_URL =
  process.env.ANALYSIS_SERVICE_URL ?? 'http://localhost:8000'

analyzeRouter.post('/', async (req: AuthRequest, res) => {
  const { id: jarId } = req.params

  // Verify the requesting user is a member of this jar
  const member = await prisma.jarMember.findUnique({
    where: { jarId_userId: { jarId, userId: req.userId! } },
  })
  if (!member) {
    res.status(404).json({ error: 'Jar not found' })
    return
  }

  // Fetch all complaint notes for this jar
  const complaints = await prisma.complaint.findMany({
    where: { jarId },
    orderBy: { createdAt: 'asc' },
    select: { note: true },
  })

  const notes = complaints
    .map((c) => c.note?.trim())
    .filter((n): n is string => Boolean(n))

  if (notes.length === 0) {
    res.status(400).json({ error: 'No complaints with notes to analyse' })
    return
  }

  // Forward to the Python analysis service
  let analysisRes: Response
  try {
    analysisRes = await fetch(`${ANALYSIS_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaints: notes }),
    })
  } catch {
    res.status(502).json({
      error: 'Analysis service is unavailable — make sure it is running',
    })
    return
  }

  if (!analysisRes.ok) {
    const body = await analysisRes.json().catch(() => ({})) as { detail?: string }
    res.status(502).json({
      error: body.detail ?? 'Analysis service returned an error',
    })
    return
  }

  const data = await analysisRes.json() as { report: string }
  res.json({ report: data.report, complaintCount: notes.length })
})
