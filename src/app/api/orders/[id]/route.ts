import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request)
    const { id } = await context.params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        providerService: {
          include: {
            service: { select: { id: true, name: true, category: true, slug: true } },
            country: { select: { id: true, name: true, code: true, phoneCode: true, flag: true } },
          },
        },
        transaction: { select: { id: true, amount: true, type: true } },
      },
    })

    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ data: order })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('GET /api/orders/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
