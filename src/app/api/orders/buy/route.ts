import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'
import { findCandidates, smartBuy } from '@/lib/smart-router'

// Fetch order expiry minutes from settings (fallback to 20)
async function getOrderExpiryMinutes(): Promise<number> {
  try {
    const setting = await db.settings.findUnique({
      where: { key: 'order_expiry_minutes' },
    })
    return setting ? (Number(setting.value) || 20) : 20
  } catch {
    return 20
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const body = await request.json()
    const { serviceId, countryCode } = body

    if (!serviceId || !countryCode) {
      return NextResponse.json({ error: 'serviceId and countryCode are required' }, { status: 400 })
    }

    // Verify the service exists
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true, category: true, slug: true },
    })

    if (!service || !service.isActive) {
      return NextResponse.json({ error: 'Service not found or inactive' }, { status: 404 })
    }

    // Check user balance first
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, balance: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find all provider candidates sorted by price
    const candidates = await findCandidates(serviceId, countryCode)

    if (candidates.length === 0) {
      return NextResponse.json({
        error: `No active providers available for ${service.name} in ${countryCode}. Please try a different country or contact support.`,
      }, { status: 404 })
    }

    // Use the cheapest provider's display price to check balance
    const cheapestPrice = candidates[0].displayPrice

    if (dbUser.balance < cheapestPrice) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          required: cheapestPrice,
          current: dbUser.balance,
          shortfall: Math.round((cheapestPrice - dbUser.balance) * 100) / 100,
        },
        { status: 400 }
      )
    }

    // Smart buy: try cheapest first, fall back to next
    const routeResult = await smartBuy(serviceId, countryCode)

    if (!routeResult.success || !routeResult.phoneNumber) {
      // All providers failed — return proper error, do NOT charge the user
      const failedSummary = routeResult.triedProviders
        .map((p) => `${p.providerName}: ${p.error}`)
        .join('; ')

      return NextResponse.json({
        error: 'All providers are currently unavailable. Please try again in a moment.',
        details: failedSummary || 'No providers responded.',
      }, { status: 503 })
    }

    // === SUCCESS: Real provider returned a number ===
    const selectedCandidate = routeResult.providerService
    const unitPrice = selectedCandidate.displayPrice

    // === FRESH balance check inside transaction to prevent race conditions ===
    const orderExpiryMinutes = await getOrderExpiryMinutes()

    const order = await db.$transaction(async (tx) => {
      // Read fresh balance within the transaction
      const freshUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { id: true, balance: true },
      })

      if (!freshUser) {
        throw new Error('User not found')
      }

      if (freshUser.balance < unitPrice) {
        throw new Error(`Insufficient balance: need $${unitPrice.toFixed(2)}, have $${freshUser.balance.toFixed(2)}`)
      }

      const now = new Date()
      const expiresAt = new Date(now.getTime() + orderExpiryMinutes * 60 * 1000)
      const newBalance = Math.round((freshUser.balance - unitPrice) * 100) / 100

      await tx.user.update({ where: { id: user.id }, data: { balance: newBalance } })

      const created = await tx.order.create({
        data: {
          userId: user.id,
          providerServiceId: selectedCandidate.providerServiceId,
          status: 'ACTIVE',
          phoneNumber: routeResult.phoneNumber,
          externalOrderId: routeResult.externalOrderId || null,
          expiresAt,
        },
        include: {
          providerService: {
            include: {
              service: { select: { id: true, name: true, category: true } },
              country: { select: { id: true, name: true, code: true, phoneCode: true, flag: true } },
              provider: { select: { name: true } },
            },
          },
        },
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'PURCHASE',
          amount: -unitPrice,
          balanceBefore: freshUser.balance,
          balanceAfter: newBalance,
          description: `Purchase ${service.name} - ${selectedCandidate.countryName} (${routeResult.phoneNumber})`,
          orderId: created.id,
        },
      })

      return { created, newBalance }
    })

    // Determine routing message
    let routingMessage = `Ordered via ${selectedCandidate.providerName}`
    if (routeResult.triedProviders.length > 1) {
      const fallbacks = routeResult.triedProviders
        .filter((p) => !p.success)
        .map((p) => p.providerName)
        .join(', ')
      if (fallbacks) {
        routingMessage += ` (fell back from: ${fallbacks})`
      }
    }

    return NextResponse.json({
      data: {
        order: {
          id: order.created.id,
          status: order.created.status,
          phoneNumber: order.created.phoneNumber,
          service: order.created.providerService.service,
          country: order.created.providerService.country,
          providerName: order.created.providerService.provider.name,
          unitPrice,
          expiresAt: order.created.expiresAt,
          createdAt: order.created.createdAt,
          routing: {
            totalProviders: routeResult.totalProviders,
            selectedProvider: selectedCandidate.providerName,
            selectedPrice: unitPrice,
            triedProviders: routeResult.triedProviders,
          },
        },
        totalCharged: unitPrice,
        newBalance: order.newBalance,
        message: `Successfully purchased ${routeResult.phoneNumber}. ${routingMessage}`,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    // Handle transaction-level balance check errors
    if (error instanceof Error && error.message.startsWith('Insufficient balance')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('POST /api/orders/buy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
