import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'
import { createProvider } from '@/lib/providers'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const { providerId, markupPercent } = body

    if (!providerId) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 })
    }

    const provider = await db.provider.findUnique({
      where: { id: providerId },
      select: { id: true, name: true, apiUrl: true, apiKey: true, isActive: true },
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    if (!provider.apiKey) {
      return NextResponse.json({ error: 'API key is not configured for this provider' }, { status: 400 })
    }

    const markup = typeof markupPercent === 'number' ? markupPercent : 30

    // Create provider instance and fetch services
    const smsProvider = createProvider({
      name: provider.name,
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
    })

    const services = await smsProvider.getServices()

    // Track stats
    let servicesCreated = 0
    let countriesCreated = 0
    let providerServicesCreated = 0
    let providerServicesUpdated = 0

    // Process each service and its countries
    for (const service of services) {
      // Create or find the internal Service
      const slug = service.externalId.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const serviceName = service.name.charAt(0).toUpperCase() + service.name.slice(1).replace(/_/g, ' ')

      let internalService = await db.service.findUnique({
        where: { slug },
      })

      if (!internalService) {
        internalService = await db.service.create({
          data: {
            name: serviceName,
            slug,
            category: service.category || 'General',
          },
        })
        servicesCreated++
      }

      // Process each country
      for (const country of service.countries) {
        // Create or find the Country
        let internalCountry = await db.country.findUnique({
          where: { code: country.code },
        })

        if (!internalCountry) {
          internalCountry = await db.country.create({
            data: {
              name: country.name,
              code: country.code,
              phoneCode: country.phoneCode,
              flag: country.flag || null,
            },
          })
          countriesCreated++
        }

        // Check if ProviderService already exists
        const existingPS = await db.providerService.findFirst({
          where: {
            providerId: provider.id,
            serviceId: internalService.id,
            countryId: internalCountry.id,
          },
        })

        if (existingPS) {
          // Update price and availability
          await db.providerService.update({
            where: { id: existingPS.id },
            data: {
              externalServiceId: service.externalId,
              externalPrice: country.price,
              isActive: country.available,
              markupPercent: markup,
            },
          })
          providerServicesUpdated++
        } else {
          // Create new ProviderService
          await db.providerService.create({
            data: {
              providerId: provider.id,
              serviceId: internalService.id,
              countryId: internalCountry.id,
              externalServiceId: service.externalId,
              externalPrice: country.price,
              markupPercent: markup,
              isActive: country.available,
            },
          })
          providerServicesCreated++
        }
      }
    }

    return NextResponse.json({
      data: {
        success: true,
        stats: {
          servicesFetched: services.length,
          servicesCreated,
          countriesCreated,
          providerServicesCreated,
          providerServicesUpdated,
        },
        message: `Synced ${services.length} services from ${provider.name}. ${servicesCreated} new services, ${countriesCreated} new countries, ${providerServicesCreated} new mappings.`,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN PROVIDERS SYNC] POST Error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to sync provider services',
      },
      { status: 500 }
    )
  }
}
