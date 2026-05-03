import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Track if seed has been attempted this process
let seedAttempted = false;
let seedDone = false;

async function ensureSeeded() {
  if (seedDone) return;
  if (seedAttempted) return;
  seedAttempted = true;
  
  try {
    // Try a simple query to check if tables exist
    await db.user.count().catch(async (err) => {
      // If tables don't exist, try to create them using raw SQL
      console.log('[AUTO-SEED] Tables may not exist, creating...');
      
      // Create tables manually using raw SQL for SQLite
      const createTables = `
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "passwordHash" TEXT NOT NULL,
          "name" TEXT,
          "role" TEXT NOT NULL DEFAULT 'USER',
          "balance" REAL NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT 1,
          "lastLogin" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "Service" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "description" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "Country" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "phoneCode" TEXT NOT NULL,
          "flag" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "Provider" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "apiKey" TEXT,
          "apiUrl" TEXT NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT 1,
          "priority" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "ProviderService" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "providerId" TEXT NOT NULL,
          "serviceId" TEXT NOT NULL,
          "countryId" TEXT,
          "externalServiceId" TEXT NOT NULL,
          "externalPrice" REAL NOT NULL,
          "markupPercent" REAL NOT NULL DEFAULT 30,
          "isActive" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "Settings" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "Order" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "providerServiceId" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "phoneNumber" TEXT,
          "externalOrderId" TEXT,
          "smsCode" TEXT,
          "smsText" TEXT,
          "expiresAt" DATETIME,
          "completedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("providerServiceId") REFERENCES "ProviderService"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "Transaction" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "orderId" TEXT,
          "topupRequestId" TEXT,
          "type" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          "balanceBefore" REAL NOT NULL,
          "balanceAfter" REAL NOT NULL,
          "description" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "TopupRequest" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          "method" TEXT NOT NULL DEFAULT 'manual',
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "txRef" TEXT,
          "proof" TEXT,
          "reviewedBy" TEXT,
          "reviewedAt" DATETIME,
          "rejectionReason" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "Notification" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'INFO',
          "isRead" BOOLEAN NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
        CREATE UNIQUE INDEX IF NOT EXISTS "Service_slug_key" ON "Service"("slug");
        CREATE UNIQUE INDEX IF NOT EXISTS "Country_code_key" ON "Country"("code");
        CREATE UNIQUE INDEX IF NOT EXISTS "Settings_key_key" ON "Settings"("key");
        CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_orderId_key" ON "Transaction"("orderId");
        CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_topupRequestId_key" ON "Transaction"("topupRequestId");
        CREATE INDEX IF NOT EXISTS "TopupRequest_status_idx" ON "TopupRequest"("status");
        CREATE INDEX IF NOT EXISTS "TopupRequest_userId_idx" ON "TopupRequest"("userId");
      `;
      
      // Execute raw SQL to create tables
      const statements = createTables.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await db.$executeRawUnsafe(stmt).catch(() => {});
      }
      console.log('[AUTO-SEED] Database tables created');
    });

    // Check if admin user exists
    const adminExists = await db.user.findUnique({
      where: { email: 'admin@verifyhub.com' },
    }).catch(() => null);

    if (!adminExists) {
      console.log('[AUTO-SEED] Creating admin user...');
      const { hashPassword } = await import('@/lib/auth');
      const passwordHash = await hashPassword('admin12345');
      
      await db.user.create({
        data: {
          email: 'admin@verifyhub.com',
          passwordHash,
          name: 'Admin',
          role: 'ADMIN',
          balance: 1000,
          isActive: true,
        },
      });
      console.log('[AUTO-SEED] Admin user created');
    }

    // Check if countries exist
    const countryCount = await db.country.count().catch(() => 0);
    if (countryCount === 0) {
      console.log('[AUTO-SEED] Creating countries...');
      const countries = [
        { name: 'United States', code: 'US', phoneCode: '+1', flag: '🇺🇸' },
        { name: 'United Kingdom', code: 'GB', phoneCode: '+44', flag: '🇬🇧' },
        { name: 'Germany', code: 'DE', phoneCode: '+49', flag: '🇩🇪' },
        { name: 'India', code: 'IN', phoneCode: '+91', flag: '🇮🇳' },
        { name: 'Netherlands', code: 'NL', phoneCode: '+31', flag: '🇳🇱' },
        { name: 'France', code: 'FR', phoneCode: '+33', flag: '🇫🇷' },
        { name: 'Brazil', code: 'BR', phoneCode: '+55', flag: '🇧🇷' },
        { name: 'Indonesia', code: 'ID', phoneCode: '+62', flag: '🇮🇩' },
        { name: 'Canada', code: 'CA', phoneCode: '+1', flag: '🇨🇦' },
        { name: 'Australia', code: 'AU', phoneCode: '+61', flag: '🇦🇺' },
        { name: 'Japan', code: 'JP', phoneCode: '+81', flag: '🇯🇵' },
        { name: 'South Korea', code: 'KR', phoneCode: '+82', flag: '🇰🇷' },
        { name: 'Mexico', code: 'MX', phoneCode: '+52', flag: '🇲🇽' },
        { name: 'Spain', code: 'ES', phoneCode: '+34', flag: '🇪🇸' },
        { name: 'Italy', code: 'IT', phoneCode: '+39', flag: '🇮🇹' },
      ];
      
      for (const country of countries) {
        await db.country.create({ data: country }).catch(() => {});
      }
      console.log(`[AUTO-SEED] ${countries.length} countries created`);
    }

    // Create default settings
    const settingsCount = await db.settings.count().catch(() => 0);
    if (settingsCount === 0) {
      console.log('[AUTO-SEED] Creating default settings...');
      const defaults = [
        { key: 'site_name', value: 'VerifyHub' },
        { key: 'default_markup', value: '30' },
        { key: 'min_topup_amount', value: '5' },
        { key: 'max_topup_amount', value: '10000' },
        { key: 'order_expiry_minutes', value: '20' },
        { key: 'welcome_bonus', value: '0' },
      ];
      for (const s of defaults) {
        await db.settings.create({ data: s }).catch(() => {});
      }
      console.log('[AUTO-SEED] Default settings created');
    }

    seedDone = true;
    console.log('[AUTO-SEED] Database initialization complete ✓');
  } catch (error) {
    console.error('[AUTO-SEED] Error during auto-seed:', error);
    seedAttempted = false; // Allow retry
  }
}

// Run seed on module load (non-blocking)
ensureSeeded().catch(console.error);

export { ensureSeeded };

export async function GET(request: NextRequest) {
  try {
    await ensureSeeded();
    const userCount = await db.user.count().catch(() => -1);
    return NextResponse.json({ 
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString(),
      database: userCount >= 0 ? `connected (${userCount} users)` : 'not connected'
    });
  } catch (error) {
    console.error('API health check error:', error);
    return NextResponse.json(
      { error: 'Service unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
