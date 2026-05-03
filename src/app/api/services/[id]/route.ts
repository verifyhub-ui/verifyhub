import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)

    const { id } = await params

    const service = await db.service.findUnique({
      where: { id },
      include: {
        providerServices: {
          where: {
            isActive: true,
            provider: { isActive: true },
            country: { isActive: true },
          },
          include: {
            provider: {
              select: { id: true, name: true, priority: true },
            },
            country: {
              select: { id: true, name: true, code: true, phoneCode: true, flag: true },
            },
            _count: {
              select: { orders: true },
            },
          },
          orderBy: [
            { provider: { priority: 'desc' } },
          ],
        },
      },
    })

    if (!service || !service.isActive) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Group by country, find cheapest price per country
    const countryMap = new Map<string, {
      country: typeof service.providerServices[0]['country'] & {}
      providers: Array<{
        providerId: string
        providerName: string
        displayPrice: number
        externalPrice: number
        markupPercent: number
        providerServiceId: string
        orderCount: number
      }>
      cheapestPrice: number
    }>()

    for (const ps of service.providerServices) {
      if (!ps.country) continue

      const displayPrice = Math.round(ps.externalPrice * (1 + ps.markupPercent / 100) * 100) / 100
      const existing = countryMap.get(ps.country.code)

      const providerInfo = {
        providerId: ps.provider.id,
        providerName: ps.provider.name,
        displayPrice,
        externalPrice: ps.externalPrice,
        markupPercent: ps.markupPercent,
        providerServiceId: ps.id,
        orderCount: ps._count.orders,
      }

      if (!existing) {
        countryMap.set(ps.country.code, {
          country: ps.country,
          providers: [providerInfo],
          cheapestPrice: displayPrice,
        })
      } else {
        existing.providers.push(providerInfo)
        if (displayPrice < existing.cheapestPrice) {
          existing.cheapestPrice = displayPrice
        }
      }
    }

    // Sort providers by price within each country
    const countriesData = Array.from(countryMap.values()).map((entry) => ({
      ...entry,
      providers: entry.providers.sort((a, b) => a.displayPrice - b.displayPrice),
    }))

    const totalOrders = service.providerServices.reduce(
      (sum, ps) => sum + ps._count.orders,
      0
    )

    const globalMinPrice = countriesData.length > 0
      ? Math.min(...countriesData.map((c) => c.cheapestPrice))
      : 0

    return NextResponse.json({
      data: {
        id: service.id,
        name: service.name,
        slug: service.slug,
        category: service.category,
        description: service.description,
        totalOrders,
        globalMinPrice,
        countries: countriesData,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET /api/services/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
