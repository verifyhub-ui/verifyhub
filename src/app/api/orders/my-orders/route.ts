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

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where: whereClause,
        include: {
          providerService: {
            include: {
              service: {
                select: { id: true, name: true, category: true, slug: true },
              },
              country: {
                select: { id: true, name: true, code: true, phoneCode: true, flag: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.order.count({ where: whereClause }),
    ])

    return NextResponse.json({
      data: orders.map((order) => ({
        id: order.id,
        status: order.status,
        phoneNumber: order.phoneNumber,
        smsCode: order.status === 'COMPLETED' ? order.smsCode : undefined,
        expiresAt: order.expiresAt,
        completedAt: order.completedAt,
        createdAt: order.createdAt,
        service: order.providerService.service,
        country: order.providerService.country,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET /api/orders/my-orders error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
