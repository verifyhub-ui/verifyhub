import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 20))
    const status = searchParams.get('status') || ''
    const userId = searchParams.get('userId') || ''

    const where: Prisma.TopupRequestWhereInput = {}

    if (status) {
      where.status = status
    }

    if (userId) {
      where.userId = userId
    }

    const [topupRequests, total] = await Promise.all([
      db.topupRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
          transaction: {
            select: { id: true, amount: true, type: true, balanceBefore: true, balanceAfter: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.topupRequest.count({ where }),
    ])

    // Fetch summary counts (total, not filtered by current pagination status)
    const [pendingCount, pendingTotalResult, approvedCount, rejectedCount] = await Promise.all([
      db.topupRequest.count({ where: { status: 'PENDING' } }),
      db.topupRequest.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
      db.topupRequest.count({ where: { status: 'APPROVED' } }),
      db.topupRequest.count({ where: { status: 'REJECTED' } }),
    ])

    const summary = {
      pendingCount,
      pendingTotal: pendingTotalResult._sum.amount ?? 0,
      approvedCount,
      rejectedCount,
    }

    return NextResponse.json({
      data: topupRequests,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN TOPUP REQUESTS] GET Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch topup requests' },
      { status: 500 }
    )
  }
}
