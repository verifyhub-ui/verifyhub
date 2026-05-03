// ==================== Smart Router ====================
// Automatically selects the lowest-price provider for a service+country
// Falls back to next cheapest if the first fails (up to 4 providers)

import { db } from '@/lib/db'
import { createProvider } from '@/lib/providers'
import type { BuyNumberResult } from '@/lib/providers/types'

export interface SmartRouteCandidate {
  providerServiceId: string
  providerId: string
  providerName: string
  externalServiceId: string
  externalPrice: number
  markupPercent: number
  displayPrice: number
  countryCode: string
  countryName: string
  phoneCode: string
  flag: string | null
  serviceName: string
}

export interface SmartRouteResult {
  success: boolean
  providerService: SmartRouteCandidate
  phoneNumber?: string
  externalOrderId?: string
  triedProviders: Array<{
    providerName: string
    displayPrice: number
    success: boolean
    error?: string
  }>
  totalProviders: number
}

const MAX_FALLBACK_PROVIDERS = 4

/**
 * Find all active providers for a service+country, sorted by lowest display price
 */
export async function findCandidates(
  serviceId: string,
  countryCode: string
): Promise<SmartRouteCandidate[]> {
  const providerServices = await db.providerService.findMany({
    where: {
      serviceId,
      country: { code: countryCode },
      isActive: true,
      provider: {
        isActive: true,
        apiKey: { not: null },
      },
    },
    include: {
      provider: {
        select: { id: true, name: true, apiUrl: true, apiKey: true, isActive: true, priority: true },
      },
      service: { select: { id: true, name: true, category: true } },
      country: { select: { id: true, name: true, code: true, phoneCode: true, flag: true } },
    },
    orderBy: { externalPrice: 'asc' },
  })

  const candidates: SmartRouteCandidate[] = providerServices.map((ps) => {
    const displayPrice = Math.round(ps.externalPrice * (1 + ps.markupPercent / 100) * 100) / 100
    return {
      providerServiceId: ps.id,
      providerId: ps.provider.id,
      providerName: ps.provider.name,
      externalServiceId: ps.externalServiceId,
      externalPrice: ps.externalPrice,
      markupPercent: ps.markupPercent,
      displayPrice,
      countryCode: ps.country!.code,
      countryName: ps.country!.name,
      phoneCode: ps.country!.phoneCode,
      flag: ps.country!.flag,
      serviceName: ps.service.name,
    }
  })

  // Sort by display price ascending (cheapest first)
  candidates.sort((a, b) => a.displayPrice - b.displayPrice)

  return candidates.slice(0, MAX_FALLBACK_PROVIDERS)
}

/**
 * Try to buy a number, falling back through providers from cheapest to most expensive
 */
export async function smartBuy(
  serviceId: string,
  countryCode: string
): Promise<SmartRouteResult> {
  const candidates = await findCandidates(serviceId, countryCode)

  if (candidates.length === 0) {
    return {
      success: false,
      providerService: {} as SmartRouteCandidate,
      triedProviders: [],
      totalProviders: 0,
    }
  }

  const triedProviders: SmartRouteResult['triedProviders'] = []

  for (const candidate of candidates) {
    try {
      // Get fresh provider config from DB
      const provider = await db.provider.findUnique({
        where: { id: candidate.providerId },
        select: { id: true, name: true, apiUrl: true, apiKey: true, isActive: true },
      })

      if (!provider || !provider.isActive || !provider.apiKey) {
        triedProviders.push({
          providerName: candidate.providerName,
          displayPrice: candidate.displayPrice,
          success: false,
          error: 'Provider unavailable or no API key',
        })
        continue
      }

      const smsProvider = createProvider({
        name: provider.name,
        apiUrl: provider.apiUrl,
        apiKey: provider.apiKey,
      })

      const result: BuyNumberResult = await smsProvider.buyNumber(
        candidate.externalServiceId,
        candidate.countryCode
      )

      if (result.success && result.phoneNumber && result.externalOrderId) {
        return {
          success: true,
          providerService: candidate,
          phoneNumber: result.phoneNumber,
          externalOrderId: result.externalOrderId,
          triedProviders: [
            ...triedProviders,
            {
              providerName: candidate.providerName,
              displayPrice: candidate.displayPrice,
              success: true,
            },
          ],
          totalProviders: candidates.length,
        }
      }

      triedProviders.push({
        providerName: candidate.providerName,
        displayPrice: candidate.displayPrice,
        success: false,
        error: result.error || 'Provider returned no number',
      })
    } catch (err) {
      triedProviders.push({
        providerName: candidate.providerName,
        displayPrice: candidate.displayPrice,
        success: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      })
    }
  }

  // All providers failed
  return {
    success: false,
    providerService: candidates[0],
    triedProviders,
    totalProviders: candidates.length,
  }
}
