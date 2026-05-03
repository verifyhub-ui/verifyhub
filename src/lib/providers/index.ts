// ==================== Provider Factory & Registry ====================
// Creates the correct provider instance based on the provider name/type

import type { SMSProvider, ProviderConfig } from './types'
import { FiveSimProvider, FIVESIM_SETUP_GUIDE } from './5sim'
import { HeroSMSProvider, HEROSMS_SETUP_GUIDE } from './herosms'
import { SmsManProvider, SMSMAN_SETUP_GUIDE } from './smsman'

// Provider type identifiers
export type ProviderType = '5sim' | 'herosms' | 'smsman' | 'sms-activate' | 'custom'

// Known provider configurations for quick setup
export interface ProviderTemplate {
  type: ProviderType
  name: string
  apiUrl: string
  description: string
  setupGuide: {
    steps: { title: string; description: string }[]
    apiDocs: string
    currency: string
  }
}

// Available provider templates
export const PROVIDER_TEMPLATES: Record<ProviderType, ProviderTemplate> = {
  '5sim': {
    type: '5sim',
    name: '5sim',
    apiUrl: 'https://5sim.net/v1',
    description: 'One of the largest SMS verification number providers. Supports 150+ countries.',
    setupGuide: FIVESIM_SETUP_GUIDE,
  },
  'herosms': {
    type: 'herosms',
    name: 'HeroSMS',
    apiUrl: 'https://hero-sms.com/stubs/handler_api.php',
    description: 'Reliable SMS provider with competitive pricing, 200+ countries. SMS-Activate compatible API.',
    setupGuide: HEROSMS_SETUP_GUIDE,
  },
  'smsman': {
    type: 'smsman',
    name: 'SMS-Man',
    apiUrl: 'https://api.sms-man.com',
    description: 'Popular SMS rent API with 200+ countries. Token-based REST API with number rental.',
    setupGuide: SMSMAN_SETUP_GUIDE,
  },
  'sms-activate': {
    type: 'sms-activate',
    name: 'SMS-Activate',
    apiUrl: 'https://api.sms-activate.org/stubs/handler_api.php',
    description: 'Popular SMS verification service (uses HeroSMS compatible API).',
    setupGuide: HEROSMS_SETUP_GUIDE,
  },
  'custom': {
    type: 'custom',
    name: 'Custom Provider',
    apiUrl: '',
    description: 'Configure a custom provider with your own API endpoint.',
    setupGuide: {
      steps: [],
      apiDocs: '',
      currency: 'USD',
    },
  },
}

/**
 * Create a provider instance from a Provider record
 */
export function createProvider(config: {
  name: string
  apiUrl: string
  apiKey: string
}): SMSProvider {
  const providerConfig: ProviderConfig = {
    name: config.name,
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
  }

  const nameLower = config.name.toLowerCase().trim()

  // Detect by name first
  if (nameLower.includes('5sim')) {
    return new FiveSimProvider(providerConfig)
  }

  if (nameLower.includes('sms-man') || nameLower.includes('smsman')) {
    return new SmsManProvider(providerConfig)
  }

  if (nameLower.includes('hero') || nameLower === 'herosms') {
    return new HeroSMSProvider(providerConfig)
  }

  // Detect by API URL
  if (config.apiUrl.includes('5sim')) {
    return new FiveSimProvider(providerConfig)
  }

  if (config.apiUrl.includes('sms-man.com') || config.apiUrl.includes('api.sms-man.com')) {
    return new SmsManProvider(providerConfig)
  }

  if (config.apiUrl.includes('herosms') || config.apiUrl.includes('hero-sms')) {
    return new HeroSMSProvider(providerConfig)
  }

  // Detect handler_api.php format (SMS-Activate compatible) → use HeroSMS provider
  if (config.apiUrl.includes('handler_api.php')) {
    return new HeroSMSProvider(providerConfig)
  }

  // Fallback to 5sim format
  console.warn(`[Provider] Unknown provider type: ${config.name}. Defaulting to 5sim API format.`)
  return new FiveSimProvider(providerConfig)
}

/**
 * Detect provider type from name or API URL
 */
export function detectProviderType(name: string, apiUrl: string): ProviderType {
  const nameLower = name.toLowerCase()

  if (nameLower.includes('5sim') || apiUrl.includes('5sim')) return '5sim'
  if (nameLower.includes('sms-man') || nameLower.includes('smsman') || apiUrl.includes('sms-man.com')) return 'smsman'
  if (nameLower.includes('hero') || apiUrl.includes('herosms') || apiUrl.includes('hero-sms')) return 'herosms'
  if (apiUrl.includes('handler_api.php')) return 'herosms'
  if (nameLower.includes('sms-activate') || apiUrl.includes('sms-activate')) return 'sms-activate'

  return 'custom'
}

/**
 * Get setup guide for a provider type
 */
export function getSetupGuide(providerType: ProviderType) {
  return PROVIDER_TEMPLATES[providerType]?.setupGuide || PROVIDER_TEMPLATES['custom'].setupGuide
}

// Re-export types
export type {
  SMSProvider,
  ProviderConfig,
  BuyNumberResult,
  CheckSmsResult,
  CancelOrderResult,
  ProviderBalance,
  ProviderTestResult,
  ServiceWithCountries,
} from './types'
