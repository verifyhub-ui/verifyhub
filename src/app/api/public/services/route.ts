import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Famous/popular services that should always appear at the top
// Lower index = higher priority. Services within same priority sorted by popularity.
const FEATURED_SERVICES: Record<string, number> = {
  // Social Media (top tier)
  'whatsapp': 1,
  'facebook': 2,
  'instagram': 3,
  'telegram': 4,
  'tiktok': 5,
  'twitter': 6,
  'snapchat': 7,
  'linkedin': 8,
  'reddit': 9,
  'discord': 10,
  'tinder': 11,
  'badoo': 12,
  'pinterest': 13,
  // Email & Communication
  'google': 15,
  'hotmail': 16,
  'yahoo': 17,
  'outlook': 18,
  'viber': 19,
  'line': 20,
  'wechat': 21,
  'skype': 22,
  'zoom': 23,
  // Shopping & Services
  'amazon': 24,
  'fiverr': 25,
  'upwork': 26,
  'ebay': 27,
  'flipkart': 28,
  'olx': 29,
  'swiggy': 30,
  'zomato': 31,
  'airbnb': 32,
  'uber': 33,
  // Tech & Finance
  'apple': 34,
  'microsoft': 35,
  'paypal': 36,
  'netflix': 37,
  'spotify': 38,
  'openai': 39,
  'claudeai': 40,
  // Gaming
  'steam': 41,
  'blizzard': 42,
}

function buildIncludeOptions(country: string) {
  return {
    providerServices: {
      where: {
        isActive: true,
        provider: { isActive: true },
        ...(country ? { country: { code: country } } : {}),
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
    },
  }
}

function processService(service: { id: string; name: string; slug: string; category: string; description: string | null; providerServices: Array<{ country: any; externalPrice: number; markupPercent: number; provider: { name: string }; _count: { orders: number } }> }) {
  const totalOrders = service.providerServices.reduce(
    (sum, ps) => sum + ps._count.orders,
    0
  )

  // Group provider services by country — track cheapest price + provider count
  const countryMap = new Map<string, {
    country: NonNullable<typeof service.providerServices[0]['country']>
    price: number
    providerName: string
    providerCount: number
  }>()

  for (const ps of service.providerServices) {
    if (!ps.country) continue
    const displayPrice = Math.round(ps.externalPrice * (1 + ps.markupPercent / 100) * 100) / 100
    const existing = countryMap.get(ps.country.code)

    if (!existing) {
      countryMap.set(ps.country.code, {
        country: ps.country,
        price: displayPrice,
        providerName: ps.provider.name,
        providerCount: 1,
      })
    } else {
      existing.providerCount++
      if (displayPrice < existing.price) {
        existing.price = displayPrice
        existing.providerName = ps.provider.name
      }
    }
  }

  const availableCountries = Array.from(countryMap.values())
  const minPrice = availableCountries.length > 0
    ? Math.min(...availableCountries.map((c) => c.price))
    : 0

  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    category: service.category,
    description: service.description,
    popularity: totalOrders,
    minPrice,
    availableCountries,
  }
}

function featuredSort(a: { slug: string; popularity: number }, b: { slug: string; popularity: number }) {
  const aPriority = FEATURED_SERVICES[a.slug.toLowerCase()] ?? 9999
  const bPriority = FEATURED_SERVICES[b.slug.toLowerCase()] ?? 9999
  // Featured services first (by priority order), then by popularity
  if (aPriority !== bPriority) return aPriority - bPriority
  return b.popularity - a.popularity
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || ''
    const category = searchParams.get('category') || ''
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Build where clause for active services with active providers
    const whereClause: Record<string, unknown> = {
      isActive: true,
      providerServices: {
        some: {
          isActive: true,
          provider: { isActive: true },
          ...(country ? { country: { code: country } } : {}),
        },
      },
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: search } } : {}),
    }

    // Get total count
    const total = await db.service.count({ where: whereClause })

    const includeOpts = buildIncludeOptions(country)

    // Fetch featured services explicitly (they might not appear in top-N by provider count)
    const featuredSlugs = Object.keys(FEATURED_SERVICES)
    const featuredWhere = {
      ...whereClause,
      slug: { in: featuredSlugs },
    }
    const featuredServicesRaw = await db.service.findMany({
      where: featuredWhere,
      include: includeOpts,
    })

    // Fetch all remaining non-featured services ordered by provider count
    const remainingWhere = {
      ...whereClause,
      slug: { notIn: featuredSlugs },
    }
    const remainingServicesRaw = await db.service.findMany({
      where: remainingWhere,
      include: includeOpts,
      orderBy: {
        providerServices: {
          _count: 'desc',
        },
      },
    })

    // Process all services
    const featuredProcessed = featuredServicesRaw.map(processService).sort(featuredSort)
    const remainingProcessed = remainingServicesRaw.map(processService).sort((a, b) => b.popularity - a.popularity)

    // Combine: featured first, then remaining by popularity
    const allSorted = [...featuredProcessed, ...remainingProcessed]

    // Apply pagination
    const totalPages = Math.ceil(allSorted.length / limit)
    const skip = (page - 1) * limit
    const paginated = allSorted.slice(skip, skip + limit)

    return NextResponse.json({
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('GET /api/public/services error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
