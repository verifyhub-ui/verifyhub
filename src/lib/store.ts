import { create } from 'zustand'
import { api, type User } from './api'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,

  login: async (email: string, password: string) => {
    const data = await api.post<{ user: User }>('/api/auth/login', { email, password })
    set({
      user: data.user,
      isAuthenticated: true,
      isAdmin: data.user.role === 'ADMIN',
    })
  },

  register: async (email: string, password: string, name?: string) => {
    const data = await api.post<{ user: User }>('/api/auth/register', { email, password, name })
    set({
      user: data.user,
      isAuthenticated: true,
      isAdmin: data.user.role === 'ADMIN',
    })
  },

  logout: () => {
    // Call server-side logout to clear HttpOnly cookie
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
      // Silently fail — cookie will be cleared on next auth check
    })
    set({ user: null, isAuthenticated: false, isAdmin: false })
  },

  fetchUser: async () => {
    try {
      const data = await api.get<{ user: User }>('/api/auth/me')
      set({
        user: data.user,
        isAuthenticated: true,
        isAdmin: data.user.role === 'ADMIN',
        isLoading: false,
      })
    } catch {
      set({ user: null, isAuthenticated: false, isAdmin: false, isLoading: false })
      throw new Error('Auth failed')
    }
  },
}))

// Listen for auth:logout events from API client
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout()
  })
}
