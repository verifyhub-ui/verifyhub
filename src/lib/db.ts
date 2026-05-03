import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

// ==================== LIBSQL ADAPTER FOR CLOUD DB ====================
function createLibSQLAdapter(): { client: Client; adapter: PrismaLibSql } | null {
  const databaseUrl = process.env.DATABASE_URL || ''
  
  // Use libsql adapter for Turso cloud URLs or HTTP URLs
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')) {
    const client = createClient({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    })
    const adapter = new PrismaLibSql(client)
    return { client, adapter }
  }
  
  return null
}

function createPrismaClient(): PrismaClient {
  const libsql = createLibSQLAdapter()
  
  if (libsql) {
    return new PrismaClient({ adapter: libsql.adapter })
  }
  
  // Default: SQLite via file URL
  // On Vercel, use /tmp for writable storage
  let dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db'
  
  // If running on Vercel and still using a file: URL, redirect to /tmp
  if (process.env.NODE_ENV === 'production' && dbUrl.startsWith('file:')) {
    dbUrl = 'file:/tmp/verifyhub.db'
  }
  
  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })
}

// ==================== SINGLETON PATTERN ====================
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
