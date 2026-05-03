import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

// Famous/popular services that should always appear at the top
const FEATURED_SERVICES: Record<string, number> = {
  'whatsapp': 1, 'facebook': 2, 'instagram': 3, 'telegram': 4, 'tiktok': 5,
  'twitter': 6, 'snapchat': 7, 'linkedin': 8, 'reddit': 9, 'discord': 10,
  'tinder': 11, 'badoo': 12, 'pinterest': 13,
  'google': 15, 'hotmail': 16, 'yahoo': 17, 'outlook': 18,
  'viber': 19, 'line': 20, 'wechat': 21, 'skype': 22, 'zoom': 23,
  'amazon': 24, 'fiverr': 25, 'upwork': 26, 'ebay': 27, 'flipkart': 28,
  'olx': 29, 'swiggy': 30, 'zomato': 31, 'airbnb': 32, 'uber': 33,
  'apple': 34, 'microsoft': 35, 'paypal': 36, 'netflix': 37, 'spotify': 38,
  'openai': 39, 'claudeai': 40, 'steam': 41, 'blizzard': 42,
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
        provider: { select: { id: true, name: true, priority: true } },
        country: { select: { id: true, name: true, code: true, phoneCode: true, flag: true } },
        _count: { select: { orders: true } },
      },
    },
  }
}

function processService(service: { id: string; name: string; slug: string; category: string; description: string | null; providerServices: Array<{ country: any; externalPrice: number; markupPercent: number; provider: { name: string }; _count: { orders: number } }> }) {
  const totalOrders = service.providerServices.reduce((sum, ps) => sum + ps._count.orders, 0)
  const countryMap = new Map<string, { country: any; price: number; providerName: string; providerCount: number }>()
  for (const ps of service.providerServices) {
    if (!ps.country) continue
    const displayPrice = Math.round(ps.externalPrice * (1 + ps.markupPercent / 100) * 100) / 100
    const existing = countryMap.get(ps.country.code)
    if (!existing) {
      countryMap.set(ps.country.code, { country: ps.country, price: displayPrice, providerName: ps.provider.name, providerCount: 1 })
    } else {
      existing.providerCount++
      if (displayPrice < existing.price) { existing.price = displayPrice; existing.providerName = ps.provider.name }
    }
  }
  const availableCountries = Array.from(countryMap.values())
  const minPrice = availableCountries.length > 0 ? Math.min(...availableCountries.map((c) => c.price)) : 0
  return { id: service.id, name: service.name, slug: service.slug, category: service.category, description: service.description, popularity: totalOrders, minPrice, availableCountries }
}

function featuredSort(a: { slug: string; popularity: number }, b: { slug: string; popularity: number }) {
  const aPriority = FEATURED_SERVICES[a.slug.toLowerCase()] ?? 9999
  const bPriority = FEATURED_SERVICES[b.slug.toLowerCase()] ?? 9999
  if (aPriority !== bPriority) return aPriority - bPriority
  return b.popularity - a.popularity
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || ''
    const category = searchParams.get('category') || ''
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const whereClause: Record<string, unknown> = {
      isActive: true,
      providerServices: { some: { isActive: true, provider: { isActive: true }, ...(country ? { country: { code: country } } : {}) } },
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: search } } : {}),
    }

    const total = await db.service.count({ where: whereClause })
    const includeOpts = buildIncludeOptions(country)
    const featuredSlugs = Object.keys(FEATURED_SERVICES)

    // Fetch featured services first
    const featuredRaw = await db.service.findMany({ where: { ...whereClause, slug: { in: featuredSlugs } }, include: includeOpts })
    // Fetch remaining by provider count
    const remainingRaw = await db.service.findMany({ where: { ...whereClause, slug: { notIn: featuredSlugs } }, include: includeOpts, orderBy: { providerServices: { _count: 'desc' } } })

    const allSorted = [
      ...featuredRaw.map(processService).sort(featuredSort),
      ...remainingRaw.map(processService).sort((a, b) => b.popularity - a.popularity),
    ]

    const totalPages = Math.ceil(allSorted.length / limit)
    const skip = (page - 1) * limit
    const paginated = allSorted.slice(skip, skip + limit)

    return NextResponse.json({ data: paginated, pagination: { page, limit, total, totalPages } })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET /api/services error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
