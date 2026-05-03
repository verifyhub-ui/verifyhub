import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // --- Admin user ---
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@verifyhub.com' },
  })

  if (!existingAdmin) {
    const passwordHash = await hashPassword('admin12345')
    await prisma.user.create({
      data: {
        email: 'admin@verifyhub.com',
        passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        balance: 1000,
        isActive: true,
      },
    })
    console.log('✅ Admin user created (admin@verifyhub.com / admin12345)')
  } else {
    console.log('⏭️  Admin user already exists, skipping')
  }

  // --- Demo countries ---
  const countries = [
    { name: 'United States', code: 'US', phoneCode: '+1', flag: '🇺🇸' },
    { name: 'United Kingdom', code: 'GB', phoneCode: '+44', flag: '🇬🇧' },
    { name: 'Germany', code: 'DE', phoneCode: '+49', flag: '🇩🇪' },
    { name: 'India', code: 'IN', phoneCode: '+91', flag: '🇮🇳' },
    { name: 'Netherlands', code: 'NL', phoneCode: '+31', flag: '🇳🇱' },
    { name: 'France', code: 'FR', phoneCode: '+33', flag: '🇫🇷' },
    { name: 'Brazil', code: 'BR', phoneCode: '+55', flag: '🇧🇷' },
    { name: 'Indonesia', code: 'ID', phoneCode: '+62', flag: '🇮🇩' },
  ]

  let createdCount = 0
  for (const country of countries) {
    const exists = await prisma.country.findUnique({
      where: { code: country.code },
    })
    if (!exists) {
      await prisma.country.create({ data: country })
      createdCount++
    }
  }
  console.log(`✅ ${createdCount} countries created (${countries.length - createdCount} already existed)`)

  console.log('🎉 Seeding complete')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
