// ==================== Provider Types & Interfaces ====================
// Common types for all SMS provider integrations

export interface ProviderConfig {
  apiKey: string
  apiUrl: string
  name: string
}

export interface BuyNumberResult {
  success: boolean
  phoneNumber?: string
  externalOrderId?: string
  error?: string
  expiresAt?: Date
}

export interface CheckSmsResult {
  status: 'waiting' | 'received' | 'expired' | 'cancelled' | 'error'
  smsCode?: string
  smsText?: string
  error?: string
}

export interface CancelOrderResult {
  success: boolean
  refunded?: boolean
  error?: string
}

export interface ProviderBalance {
  balance: number
  currency: string
}

export interface ServiceWithCountries {
  externalId: string
  name: string
  category: string
  countries: {
    code: string
    name: string
    phoneCode: string
    flag?: string
    price: number
    available: boolean
  }[]
}

export interface ProviderTestResult {
  success: boolean
  balance?: ProviderBalance
  error?: string
  responseTime?: number
}

// Abstract interface all providers must implement
export interface SMSProvider {
  readonly name: string
  readonly apiUrl: string

  // Core operations
  buyNumber(externalServiceId: string, country: string): Promise<BuyNumberResult>
  checkSms(externalOrderId: string): Promise<CheckSmsResult>
  cancelOrder(externalOrderId: string): Promise<CancelOrderResult>

  // Admin operations
  getBalance(): Promise<ProviderBalance>
  testConnection(): Promise<ProviderTestResult>

  // Service catalog
  getServices(): Promise<ServiceWithCountries[]>
}
