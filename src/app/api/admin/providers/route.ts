import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const providers = await db.provider.findMany({
      select: {
        id: true,
        name: true,
        apiUrl: true,
        apiKey: true,
        isActive: true,
        priority: true,
        createdAt: true,
        _count: {
          select: { providerServices: true },
        },
      },
      orderBy: { priority: 'desc' },
    })

    // Mask API keys before returning - show first 4 + last 4 chars
    const maskedProviders = providers.map(p => ({
      ...p,
      apiKey: p.apiKey ? `${p.apiKey.slice(0, 6)}${'•'.repeat(Math.max(0, p.apiKey.length - 10))}${p.apiKey.slice(-4)}` : null,
      hasApiKey: !!p.apiKey,
    }))

    return NextResponse.json({ data: maskedProviders, pagination: { page: 1, limit: 100, total: maskedProviders.length, totalPages: 1 } })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN PROVIDERS] GET Error:', err)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { name, apiKey, apiUrl, priority } = body

    if (!name || !apiUrl) {
      return NextResponse.json({ error: 'Name and API URL are required' }, { status: 400 })
    }

    const provider = await db.provider.create({
      data: {
        name: String(name),
        apiKey: apiKey ? String(apiKey) : null,
        apiUrl: String(apiUrl),
        priority: typeof priority === 'number' ? priority : 0,
      },
    })

    return NextResponse.json({ data: provider }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN PROVIDERS] POST Error:', err)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 })
  }
}
