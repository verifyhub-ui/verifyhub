import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'
import { createProvider } from '@/lib/providers'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        transaction: { select: { id: true, amount: true } },
        providerService: {
          include: {
            service: { select: { id: true, name: true } },
            country: { select: { name: true } },
            provider: { select: { name: true, apiUrl: true, apiKey: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!['PENDING', 'ACTIVE'].includes(order.status)) {
      return NextResponse.json({ error: `Cannot cancel order with status: ${order.status}` }, { status: 400 })
    }

    // Try to cancel with the real provider if we have an externalOrderId
    if (order.externalOrderId && order.providerService.provider.apiKey) {
      try {
        const provider = createProvider({
          name: order.providerService.provider.name,
          apiUrl: order.providerService.provider.apiUrl,
          apiKey: order.providerService.provider.apiKey,
        })

        const result = await provider.cancelOrder(order.externalOrderId)
        if (!result.success) {
          console.warn(`[CANCEL] Provider cancel failed for order ${orderId}:`, result.error)
          // Still proceed with local cancellation
        }
      } catch (err) {
        console.error(`[CANCEL] Provider cancel error for order ${orderId}:`, err)
        // Still proceed with local cancellation
      }
    }

    const refundAmount = order.transaction ? Math.abs(order.transaction.amount) : 0

    await db.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      })

      // Refund balance
      if (refundAmount > 0) {
        const dbUser = await tx.user.findUnique({ where: { id: user.id }, select: { balance: true } })
        const newBalance = (dbUser?.balance ?? 0) + refundAmount

        await tx.user.update({
          where: { id: user.id },
          data: { balance: newBalance },
        })

        await tx.transaction.create({
          data: {
            userId: user.id,
            orderId: order.id,
            type: 'REFUND',
            amount: refundAmount,
            balanceBefore: dbUser?.balance ?? 0,
            balanceAfter: newBalance,
            description: `Refund for cancelled order: ${order.providerService.service.name}`,
          },
        })
      }
    })

    return NextResponse.json({
      message: 'Order cancelled successfully',
      refundAmount,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/orders/cancel error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
