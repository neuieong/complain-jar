// ─── Seed script ──────────────────────────────────────────────────────────────
// Creates a demo user + jar + 63 realistic complaints spread over the last
// 30 days. Idempotent: if the user already exists, clears existing complaints
// and re-seeds them so this script can be run any time to restore demo data.
//
// Run:  npx tsx prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_EMAIL = 'demo@complainjar.dev'
const SEED_PASSWORD = 'password123'
const SEED_NAME = 'Demo User'

// 63 complaints across themes: traffic, work, weather, tech, food, people, chores
const COMPLAINT_NOTES = [
  // Traffic & commute
  'Traffic was an absolute nightmare — sat in the same spot for 20 minutes',
  'It took 15 minutes to find parking and I was late',
  'Someone took my parking spot that I\'ve used for two years',
  'The bus was 12 minutes late and I missed my connection',
  'The traffic light at Main Street has been broken for three days',
  'Someone parked in two spots in a full car park',

  // Work & meetings
  'Three meetings in a row with no break. I\'m exhausted.',
  'Someone scheduled a Friday 4pm meeting. Why.',
  'Meeting could have been an email. Classic.',
  'The conference call started 10 minutes late and ran over by 20',
  'Someone replied-all to a company-wide email unnecessarily',
  'My laptop update restarted without asking during a presentation',
  'The report I spent two hours on got corrupted',

  // Tech & devices
  'The Wi-Fi keeps dropping in the middle of my calls',
  'App crashed and I lost everything I typed',
  'My laptop fan sounds like a helicopter taking off',
  'My headphones died right when the good part of the podcast started',
  'Autocorrect changed something embarrassing in a work email',
  'My phone battery dies at 20% every single time',
  'My alarm didn\'t go off and I was late to a meeting',
  'My streaming service keeps buffering at the best moments',
  'My phone autocorrected my boss\'s name to something embarrassing',
  'My subscription renewed without a reminder email',
  'The vending machine took my money and got stuck',

  // Food & dining
  'My coffee was lukewarm again. I ask every single time.',
  'Food delivery was 45 minutes late and arrived cold',
  'The restaurant got my order wrong again',
  'Got charged twice for the same coffee',
  'My coffee maker leaked all over the counter this morning',
  'Someone used the last of the milk and didn\'t write it on the list',

  // People & social
  'Coworker microwaved fish in the break room. Again.',
  'Had to repeat myself four times on a customer service call',
  'The automated phone system hung up on me after 10 minutes on hold',
  'The cashier called over a manager to check my discount code',
  'The supermarket express lane had someone with a full trolley',
  'Someone ate my lunch from the office fridge',

  // Home & chores
  'The dishwasher didn\'t clean anything properly, everything needs to be redone',
  'Neighbour\'s dog barked for an hour straight at 7am',
  'The neighbour started drilling at 8am on a Saturday',
  'Someone left the kitchen light on all night again',
  'My chair keeps sinking no matter how many times I adjust it',
  'My earphones keep falling out while I run',

  // Weather & outdoors
  'It\'s raining and I forgot my umbrella',
  'Got caught in the rain walking from the car',
  'My umbrella inverted in the wind and is now useless',
  'My glasses fogged up the moment I walked inside',

  // Errands & services
  'Package says delivered but it\'s definitely not here',
  'The queue at the post office was 40 minutes long',
  'Grocery store was out of the one thing I actually needed',
  'The grocery store changed their layout and I can\'t find anything',
  'The elevator has been out of service all week',
  'The ATM nearest to me was out of service',
  'The public bathroom had no paper towels',
  'My internet is slow again during peak hours',
  'My delivery driver left the package in the rain',
  'The recycling bin was full so I had to carry my stuff back',
  'I got charged a cancellation fee for a booking I cancelled weeks ago',

  // Sleep & health
  'Woke up at 3am and couldn\'t get back to sleep',
  'The gym was packed and every machine I wanted was taken',

  // Printer & misc
  'Printer jammed right before an important deadline',
  'The supermarket self-checkout kept asking for attendant help',
  'The hotel pillow was completely flat',
  'Someone finished the coffee and didn\'t make a new pot',
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

  let user = await prisma.user.findUnique({ where: { email: SEED_EMAIL } })

  if (user) {
    console.log(`✓ Seed user ${SEED_EMAIL} already exists — clearing complaints for re-seed.`)
    // Find the user's jar and delete all its complaints
    const jar = await prisma.jar.findFirst({ where: { ownerId: user.id } })
    if (jar) {
      await prisma.complaint.deleteMany({ where: { jarId: jar.id } })
      // Also clear bustedAt so the jar is active again
      await prisma.jar.update({ where: { id: jar.id }, data: { bustedAt: null } })
      console.log(`✓ Cleared existing complaints from jar "${jar.name}"`)
    }
  } else {
    // Create user
    const hashed = await bcrypt.hash(SEED_PASSWORD, 12)
    user = await prisma.user.create({
      data: { name: SEED_NAME, email: SEED_EMAIL, password: hashed },
    })
    console.log(`✓ Created user: ${user.email} (id: ${user.id})`)
  }

  // Get or create jar
  let jar = await prisma.jar.findFirst({ where: { ownerId: user.id } })
  if (!jar) {
    jar = await prisma.jar.create({
      data: {
        name: 'Our Complain Jar',
        ownerId: user.id,
        amountPerComplaint: 100,
        currency: 'USD',
        members: { create: { userId: user.id } },
      },
    })
    console.log(`✓ Created jar: "${jar.name}" (id: ${jar.id})`)
  }

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
