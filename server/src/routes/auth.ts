import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { signToken } from '../middleware/auth'

export const authRouter = Router()

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string
    email?: string
    password?: string
  }
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'password must be at least 8 characters' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already in use' })
    return
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  })

  res.status(201).json({
    token: signToken(user.id),
    user: { id: user.id, name: user.name },
  })
})

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    // Same error for unknown email and wrong password — prevents account enumeration.
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  res.json({
    token: signToken(user.id),
    user: { id: user.id, name: user.name },
  })
})
