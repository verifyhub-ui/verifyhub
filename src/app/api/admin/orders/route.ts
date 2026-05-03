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
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Validate sort fields
    const allowedSortFields = ['createdAt', 'updatedAt', 'status', 'phoneNumber']
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

    const where: Prisma.OrderWhereInput = {}

    if (status) {
      where.status = status
    }

    if (userId) {
      where.userId = userId
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
          providerService: {
            include: {
              service: {
                select: { id: true, name: true, category: true },
              },
              country: {
                select: { id: true, name: true, code: true, phoneCode: true },
              },
              provider: {
                select: { id: true, name: true },
              },
            },
          },
          transaction: {
            select: { id: true, amount: true, type: true },
          },
        },
        orderBy: { [safeSortBy]: safeSortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ])

    return NextResponse.json({
      data: orders,
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
    console.error('[ADMIN ORDERS] GET Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
