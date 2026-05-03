import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

const DEFAULT_SETTINGS: Record<string, string> = {
  default_markup_percent: '30',
  min_topup_amount: '1',
  max_topup_amount: '10000',
  topup_requires_approval: 'true',
  auto_approve_below: '50',
  platform_name: 'VerifyHub',
  support_email: 'support@verifyhub.com',
  order_expiry_minutes: '20',
}

// Parse raw string settings into properly typed settings
function parseSettings(raw: Record<string, string>) {
  return {
    default_markup_percent: Number(raw.default_markup_percent) || 30,
    min_topup_amount: Number(raw.min_topup_amount) || 1,
    max_topup_amount: Number(raw.max_topup_amount) || 10000,
    topup_requires_approval: raw.topup_requires_approval === 'true',
    auto_approve_below: Number(raw.auto_approve_below) || 50,
    platform_name: raw.platform_name || 'VerifyHub',
    support_email: raw.support_email || 'support@verifyhub.com',
    order_expiry_minutes: Number(raw.order_expiry_minutes) || 20,
  }
}

// Convert typed settings back to strings for DB storage
function stringifySettings(settings: Record<string, unknown>): Record<string, string> {
  return {
    default_markup_percent: String(settings.default_markup_percent ?? '30'),
    min_topup_amount: String(settings.min_topup_amount ?? '1'),
    max_topup_amount: String(settings.max_topup_amount ?? '10000'),
    topup_requires_approval: String(settings.topup_requires_approval ?? 'true'),
    auto_approve_below: String(settings.auto_approve_below ?? '50'),
    platform_name: String(settings.platform_name ?? 'VerifyHub'),
    support_email: String(settings.support_email ?? 'support@verifyhub.com'),
    order_expiry_minutes: String(settings.order_expiry_minutes ?? '20'),
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const settings = await db.settings.findMany({
      select: { key: true, value: true },
    })

    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
    for (const s of settings) {
      settingsMap[s.key] = s.value
    }

    const parsed = parseSettings(settingsMap)

    return NextResponse.json({ data: parsed })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN SETTINGS] GET Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { settings } = body as { settings: Record<string, unknown> }

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json({ error: 'settings object is required' }, { status: 400 })
    }

    // Convert to strings for storage
    const settingsToStore = stringifySettings(settings)

    // Upsert each setting
    await db.$transaction(
      Object.entries(settingsToStore).map(([key, value]) =>
        db.settings.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    )

    // Return updated settings merged with defaults, parsed to proper types
    const allSettings = await db.settings.findMany({
      select: { key: true, value: true },
    })

    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
    for (const s of allSettings) {
      settingsMap[s.key] = s.value
    }

    const parsed = parseSettings(settingsMap)

    return NextResponse.json({ data: parsed })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN SETTINGS] PUT Error:', err)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
