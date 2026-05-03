import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClient = new PrismaClient()

export const db = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
