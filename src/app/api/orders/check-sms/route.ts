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
        providerService: {
          include: {
            service: { select: { name: true } },
            country: { select: { name: true, code: true } },
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

    // Check if order has expired
    if (order.expiresAt && new Date() > order.expiresAt && !order.smsCode) {
      await db.order.update({
        where: { id: orderId },
        data: { status: 'EXPIRED' },
      })
      return NextResponse.json({
        data: {
          orderId: order.id,
          status: 'EXPIRED',
          phoneNumber: order.phoneNumber,
          smsCode: null,
          smsText: null,
          message: 'Order has expired',
        },
      })
    }

    // If SMS already received, return it
    if (order.smsCode) {
      return NextResponse.json({
        data: {
          orderId: order.id,
          status: order.status,
          phoneNumber: order.phoneNumber,
          smsCode: order.smsCode,
          smsText: order.smsText,
          message: 'SMS received successfully',
        },
      })
    }

    // Try to check with the real provider if we have an externalOrderId
    if (order.externalOrderId && order.providerService.provider.apiKey) {
      try {
        const provider = createProvider({
          name: order.providerService.provider.name,
          apiUrl: order.providerService.provider.apiUrl,
          apiKey: order.providerService.provider.apiKey,
        })

        const result = await provider.checkSms(order.externalOrderId)

        if (result.status === 'received' && result.smsCode) {
          // Save the SMS code to database
          await db.order.update({
            where: { id: orderId },
            data: {
              status: 'COMPLETED',
              smsCode: result.smsCode,
              smsText: result.smsText || result.smsCode,
              completedAt: new Date(),
            },
          })

          return NextResponse.json({
            data: {
              orderId: order.id,
              status: 'COMPLETED',
              phoneNumber: order.phoneNumber,
              smsCode: result.smsCode,
              smsText: result.smsText,
              message: 'SMS received successfully',
            },
          })
        }

        if (result.status === 'expired') {
          await db.order.update({
            where: { id: orderId },
            data: { status: 'EXPIRED' },
          })
          return NextResponse.json({
            data: {
              orderId: order.id,
              status: 'EXPIRED',
              phoneNumber: order.phoneNumber,
              smsCode: null,
              smsText: null,
              message: result.error || 'Order has expired',
            },
          })
        }

        if (result.status === 'error') {
          console.error(`[CHECK-SMS] Provider error for order ${orderId}:`, result.error)
          // Continue to return waiting status instead of failing
        }

        // Still waiting
        return NextResponse.json({
          data: {
            orderId: order.id,
            status: 'waiting',
            phoneNumber: order.phoneNumber,
            smsCode: null,
            smsText: null,
            expiresAt: order.expiresAt,
            message: 'Waiting for SMS to arrive...',
          },
        })
      } catch (err) {
        console.error(`[CHECK-SMS] Provider API call failed for order ${orderId}:`, err)
        // Continue to return waiting status
      }
    }

    // No externalOrderId - return waiting status (mock/demo order)
    const isExpired = order.expiresAt ? new Date() > order.expiresAt : false
    return NextResponse.json({
      data: {
        orderId: order.id,
        status: isExpired ? 'EXPIRED' : 'waiting',
        phoneNumber: order.phoneNumber,
        smsCode: null,
        smsText: null,
        expiresAt: order.expiresAt,
        message: isExpired
          ? 'Order has expired, no SMS received'
          : 'Waiting for SMS to arrive...',
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('POST /api/orders/check-sms error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
