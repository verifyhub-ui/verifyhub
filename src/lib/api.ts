const API_BASE = ''

interface FetchOptions extends RequestInit {
  params?: Record<string, string>
}

class ApiClient {
  private getToken(): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.split(';').find(c => c.trim().startsWith('verifyhub-token='))
    return match ? match.split('=').slice(1).join('=').trim() : null
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options
    let url = `${API_BASE}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }

    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    // Safely parse JSON — handle cases where server returns HTML (404/500 pages)
    let data: any
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // Not JSON — likely an HTML error page
      const text = await response.text()
      if (!response.ok) {
        throw new ApiError(`Server error (${response.status})`, response.status)
      }
      throw new ApiError('Invalid response from server', response.status)
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Clear cookie and trigger logout
        document.cookie = 'verifyhub-token=; Path=/; Max-Age=0'
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
      throw new ApiError(data.error || 'Request failed', response.status)
    }

    return data as T
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export const api = new ApiClient()

// Response types
export interface User {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'ADMIN'
  balance: number
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
  _count?: { orders: number; transactions: number }
}

export interface Service {
  id: string
  name: string
  slug: string
  category: string
  description: string | null
  isActive: boolean
  createdAt: string
  providerServices?: ProviderService[]
  _count?: { providerServices: number }
}

export interface Country {
  id: string
  name: string
  code: string
  phoneCode: string
  flag: string | null
}

export interface ProviderService {
  id: string
  providerId: string
  serviceId: string
  countryId: string | null
  externalServiceId: string
  externalPrice: number
  markupPercent: number
  isActive: boolean
  provider?: { id: string; name: string; priority: number }
  country?: Country
  service?: { id: string; name: string; category: string }
  _count?: { orders: number }
}

export interface Order {
  id: string
  userId: string
  providerServiceId: string
  status: string
  phoneNumber: string | null
  smsCode: string | null
  smsText: string | null
  expiresAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; email: string; name: string | null }
  providerService?: ProviderService & { service: { id: string; name: string; category: string } }
  transaction?: { id: string; amount: number; type: string }
}

export interface Transaction {
  id: string
  userId: string
  orderId: string | null
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  createdAt: string
  user?: { id: string; email: string; name: string | null }
}

export interface Provider {
  id: string
  name: string
  apiKey: string | null
  apiUrl: string
  isActive: boolean
  priority: number
  createdAt: string
}

export interface DashboardStats {
  stats: {
    totalUsers: number
    totalOrders: number
    totalRevenue: number
    activeOrders: number
    pendingTopups: number
    pendingTopupAmount: number
    totalTopupVolume: number
  }
  recentOrders: Order[]
  ordersByStatus: Record<string, number>
  revenueByDay: Record<string, number>
  topServices: Array<{ serviceId: string; name: string; category: string; orderCount: number }>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
