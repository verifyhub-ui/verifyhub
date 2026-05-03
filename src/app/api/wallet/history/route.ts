import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const type = searchParams.get('type') || ''
    const skip = (page - 1) * limit

    const whereClause: Record<string, unknown> = {
      userId: user.id,
      ...(type ? { type: type.toUpperCase() } : {}),
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.transaction.count({ where: whereClause }),
    ])

    return NextResponse.json({
      data: transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('GET /api/wallet/history error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
