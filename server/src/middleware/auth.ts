import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Fail fast in production if the secret is not set — prevents accidentally
// deploying with the hardcoded dev fallback as the signing key.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set in production')
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

export interface AuthRequest extends Request {
  userId?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function signToken(userId: string): string {
  // 30-day expiry is generous for a prototype; tighten before production.
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' })
}
