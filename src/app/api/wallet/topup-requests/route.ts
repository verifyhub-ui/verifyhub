import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const status = searchParams.get('status') || ''
    const skip = (page - 1) * limit

    const whereClause: Record<string, unknown> = {
      userId: user.id,
      ...(status ? { status: status.toUpperCase() } : {}),
    }

    const [topupRequests, total] = await Promise.all([
      db.topupRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.topupRequest.count({ where: whereClause }),
    ])

    return NextResponse.json({
      data: topupRequests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('GET /api/wallet/topup-requests error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
