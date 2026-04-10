// ─── Seed script ──────────────────────────────────────────────────────────────
// Creates a demo user + jar + 25 realistic complaints spread over the last
// 30 days. Idempotent: skips creation if the seed email already exists.
//
// Run:  npx tsx prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_EMAIL = 'demo@complainjar.dev'
const SEED_PASSWORD = 'password123'
const SEED_NAME = 'Demo User'

// 25 complaints with varied notes across themes:
// traffic, work, weather, tech, food, people, chores
const COMPLAINT_NOTES = [
  'Traffic was an absolute nightmare — sat in the same spot for 20 minutes',
  'My coffee was lukewarm again. I ask every single time.',
  'The Wi-Fi keeps dropping in the middle of my calls',
  'Coworker microwaved fish in the break room. Again.',
  'Package says delivered but it\'s definitely not here',
  'Three meetings in a row with no break. I\'m exhausted.',
  'It\'s raining and I forgot my umbrella',
  'The dishwasher didn\'t clean anything properly, everything needs to be redone',
  'Someone took my parking spot that I\'ve used for two years',
  'App crashed and I lost everything I typed',
  'The queue at the post office was 40 minutes long',
  'My headphones died right when the good part of the podcast started',
  'Grocery store was out of the one thing I actually needed',
  'Had to repeat myself four times on a customer service call',
  'Woke up at 3am and couldn\'t get back to sleep',
  'It took 15 minutes to find parking and I was late',
  'Someone scheduled a Friday 4pm meeting. Why.',
  'My laptop fan sounds like a helicopter taking off',
  'The gym was packed and every machine I wanted was taken',
  'Food delivery was 45 minutes late and arrived cold',
  'Autocorrect changed something embarrassing in a work email',
  'Neighbour\'s dog barked for an hour straight at 7am',
  'Printer jammed right before an important deadline',
  'The supermarket self-checkout kept asking for attendant help',
  'Meeting could have been an email. Classic.',
]

// Spread complaints across the last 30 days with some randomness
function randomDateInLast30Days(index: number, total: number): Date {
  const now = Date.now()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  // Roughly evenly spaced but with a random offset of ±6 hours
  const base = now - thirtyDays + (thirtyDays / total) * index
  const jitter = (Math.random() - 0.5) * 6 * 60 * 60 * 1000
  return new Date(base + jitter)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed…')

  // Idempotency check
  const existing = await prisma.user.findUnique({ where: { email: SEED_EMAIL } })
  if (existing) {
    console.log(`✓ Seed user ${SEED_EMAIL} already exists — skipping.`)
    console.log('  Delete the user in Neon to re-seed from scratch.')
    return
  }

  // Create user
  const hashed = await bcrypt.hash(SEED_PASSWORD, 12)
  const user = await prisma.user.create({
    data: { name: SEED_NAME, email: SEED_EMAIL, password: hashed },
  })
  console.log(`✓ Created user: ${user.email} (id: ${user.id})`)

  // Create jar
  const jar = await prisma.jar.create({
    data: {
      name: 'Our Complain Jar',
      ownerId: user.id,
      amountPerComplaint: 100,
      currency: 'USD',
      members: { create: { userId: user.id } },
    },
  })
  console.log(`✓ Created jar: "${jar.name}" (id: ${jar.id})`)

  // Create complaints
  for (let i = 0; i < COMPLAINT_NOTES.length; i++) {
    await prisma.complaint.create({
      data: {
        jarId: jar.id,
        userId: user.id,
        note: COMPLAINT_NOTES[i],
        amount: jar.amountPerComplaint,
        createdAt: randomDateInLast30Days(i, COMPLAINT_NOTES.length),
      },
    })
  }
  console.log(`✓ Created ${COMPLAINT_NOTES.length} complaints`)

  console.log('')
  console.log('─────────────────────────────────────────')
  console.log('Seed complete. Login credentials:')
  console.log(`  Email:    ${SEED_EMAIL}`)
  console.log(`  Password: ${SEED_PASSWORD}`)
  console.log(`  Jar ID:   ${jar.id}`)
  console.log('─────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
