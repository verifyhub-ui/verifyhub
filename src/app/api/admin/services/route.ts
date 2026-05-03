import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 50))
    const category = searchParams.get('category') || ''
    const search = searchParams.get('search') || ''
    const isActiveParam = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'category']
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

    const where: Prisma.ServiceWhereInput = {}

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (isActiveParam !== null && isActiveParam !== '') {
      where.isActive = isActiveParam === 'true'
    }

    const [services, total] = await Promise.all([
      db.service.findMany({
        where,
        include: {
          _count: {
            select: {
              providerServices: true,
            },
          },
          providerServices: {
            where: { isActive: true },
            include: {
              provider: {
                select: { id: true, name: true },
              },
              country: {
                select: { id: true, name: true, code: true, phoneCode: true },
              },
            },
          },
        },
        orderBy: { [safeSortBy]: safeSortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.service.count({ where }),
    ])

    return NextResponse.json({
      data: services,
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
    console.error('[ADMIN SERVICES] GET Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
