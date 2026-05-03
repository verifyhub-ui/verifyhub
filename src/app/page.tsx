'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { LandingPage } from '@/components/landing/landing-page'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { CustomerDashboard } from '@/components/customer/customer-dashboard'
import { Loader2 } from 'lucide-react'

type ViewMode = 'landing' | 'login' | 'register' | 'dashboard'

const VIEW_STORAGE_KEY = 'verifyhub-view'

function getStoredView(): ViewMode {
  if (typeof window === 'undefined') return 'landing'
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored === 'dashboard' || stored === 'landing' || stored === 'login' || stored === 'register') {
      return stored
    }
  } catch {}
  return 'landing'
}

function setStoredView(view: ViewMode) {
  try {
    if (view === 'landing') {
      localStorage.removeItem(VIEW_STORAGE_KEY)
    } else {
      localStorage.setItem(VIEW_STORAGE_KEY, view)
    }
  } catch {}
}

export default function Home() {
  const { isAuthenticated, isLoading, isAdmin, fetchUser } = useAuthStore()
  const [view, setView] = useState<ViewMode>('landing')
  const [initialCheck, setInitialCheck] = useState(true)

  // On mount: check localStorage and verify auth
  useEffect(() => {
    const storedView = getStoredView()

    fetchUser().then(() => {
      // After auth check, determine which view to show
      const authState = useAuthStore.getState()
      if (storedView === 'dashboard' && authState.isAuthenticated) {
        // User was on dashboard and is still authenticated → stay on dashboard
        setView('dashboard')
      } else {
        // Default to landing page
        setView('landing')
      }
      setInitialCheck(false)
    }).catch(() => {
      // Auth failed → go to landing page
      setView('landing')
      setInitialCheck(false)
    })
  }, [fetchUser])

  const switchToLogin = useCallback(() => {
    setView('login')
    setStoredView('login')
  }, [])

  const switchToRegister = useCallback(() => {
    setView('register')
    setStoredView('register')
  }, [])

  const switchToLanding = useCallback(() => {
    setView('landing')
    setStoredView('landing')
  }, [])

  const switchToDashboard = useCallback(() => {
    setView('dashboard')
    setStoredView('dashboard')
  }, [])

  const handleLogout = useCallback(() => {
    useAuthStore.getState().logout()
    setView('landing')
    setStoredView('landing')
  }, [])

  // Watch for auth:logout events to redirect to landing
  useEffect(() => {
    const handleAuthLogout = () => {
      setView('landing')
      setStoredView('landing')
    }
    window.addEventListener('auth:logout', handleAuthLogout)
    return () => window.removeEventListener('auth:logout', handleAuthLogout)
  }, [])

  // Show loading only on initial auth check
  if (isLoading && initialCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0514]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  // Landing page — always show as default entry point
  if (view === 'landing') {
    return (
      <LandingPage
        onLoginClick={switchToLogin}
        isAuthenticated={isAuthenticated}
        onGoToDashboard={switchToDashboard}
      />
    )
  }

  // Login / Register forms
  if (view === 'login' || view === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0514] p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white">VerifyHub</h1>
            </div>
            <p className="text-gray-400 mt-1">SMS Verification Number Marketplace</p>
          </div>
          {view === 'login' ? (
            <LoginForm
              onSwitchToRegister={switchToRegister}
              onBack={switchToLanding}
              onLoginSuccess={switchToDashboard}
            />
          ) : (
            <RegisterForm
              onSwitchToLogin={switchToLogin}
              onBack={switchToLanding}
              onRegisterSuccess={switchToDashboard}
            />
          )}
        </div>
      </div>
    )
  }

  // Dashboard — only accessible when authenticated
  if (view === 'dashboard') {
    if (isAdmin) {
      return <AdminDashboard onLogout={handleLogout} />
    }

    return <CustomerDashboard onLogout={handleLogout} />
  }

  return null
}
