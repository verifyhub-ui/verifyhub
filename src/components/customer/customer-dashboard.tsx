'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/lib/store'
import { api, type Order, type PaginatedResponse } from '@/lib/api'
import { WalletTab } from './customer-wallet-updated'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  LayoutDashboard, ShoppingCart, Wallet, Layers, Search, LogOut, RefreshCw,
  Phone, Clock, CheckCircle2, XCircle, Copy, Eye, Zap, Loader2,
  ChevronDown, Filter, ArrowUpDown, TrendingUp, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

// ==================== Types ====================
type CustomerTab = 'browse' | 'my-orders' | 'wallet'

interface ServiceItem {
  id: string
  name: string
  slug: string
  category: string
  description: string | null
  popularity: number
  minPrice: number
  availableCountries: Array<{
    country: { name: string; code: string; phoneCode: string; flag: string | null }
    price: number
    providerName: string
    providerCount: number
  }>
}

// ==================== Glass Card Helper ====================
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
}

const glassHeader: React.CSSProperties = {
  background: 'rgba(10,5,20,0.8)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
}

const glassSidebar: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRight: '1px solid rgba(255,255,255,0.06)',
}

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
  social: 'from-pink-500 to-rose-500',
  email: 'from-amber-500 to-orange-500',
  messaging: 'from-green-500 to-emerald-500',
  ecommerce: 'from-violet-500 to-purple-500',
  banking: 'from-cyan-500 to-teal-500',
  gaming: 'from-red-500 to-pink-500',
  ride: 'from-blue-500 to-indigo-500',
  food: 'from-orange-500 to-yellow-500',
  default: 'from-violet-600 to-cyan-600',
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  social: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  email: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  messaging: 'bg-green-500/15 text-green-400 border-green-500/30',
  ecommerce: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  banking: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  gaming: 'bg-red-500/15 text-red-400 border-red-500/30',
  ride: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  food: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  default: 'bg-white/10 text-white/60 border-white/20',
}

function getCategoryGradient(category: string): string {
  const key = category.toLowerCase().trim()
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.default
}

function getCategoryBadgeClass(category: string): string {
  const key = category.toLowerCase().trim()
  return CATEGORY_BADGE_COLORS[key] || CATEGORY_BADGE_COLORS.default
}

// ==================== Animations ====================
const tabVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

// ==================== Main Component ====================
export function CustomerDashboard({ onLogout }: { onLogout?: () => void }) {
  const { user, logout: storeLogout } = useAuthStore()
  const logout = onLogout || storeLogout
  const [activeTab, setActiveTab] = useState<CustomerTab>('browse')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const tabs: { id: CustomerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'browse', label: 'Browse', icon: <Layers className="h-5 w-5" /> },
    { id: 'my-orders', label: 'My Orders', icon: <ShoppingCart className="h-5 w-5" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-5 w-5" /> },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0514]">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50" style={glassHeader}>
        <div className="flex h-16 items-center px-4 md:px-6 gap-4">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              VerifyHub
            </span>
          </div>

          <div className="flex-1" />

          {/* Balance */}
          <div
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Wallet className="h-4 w-4 text-white/40" />
            <span className="text-sm font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              ${(user?.balance ?? 0).toFixed(2)}
            </span>
          </div>

          {/* User area */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-right hidden md:block">
              <div className="text-white/90 font-medium text-sm">{user?.name ?? user?.email}</div>
              <div className="text-white/30 text-xs">Customer</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-white/40 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 transition-all duration-200"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* ===== SIDEBAR OVERLAY (mobile) ===== */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ===== SIDEBAR ===== */}
        <aside
          className={`
            fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)]
            w-64 flex flex-col py-4 px-3 gap-1 transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={glassSidebar}
        >
          <div className="px-3 pb-3 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/25">Navigation</span>
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSidebarOpen(false)
                }}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left
                  ${isActive
                    ? 'text-white bg-gradient-to-r from-violet-600/20 to-cyan-600/10 border border-violet-500/30 shadow-lg shadow-violet-500/10'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <span className={isActive ? 'text-violet-400' : 'text-white/40'}>{tab.icon}</span>
                {tab.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
                )}
              </button>
            )
          })}

          {/* Bottom section */}
          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="px-3 py-2">
              <div className="text-xs text-white/20">Balance</div>
              <div className="text-sm font-bold text-white/90 mt-0.5">
                ${(user?.balance ?? 0).toFixed(2)}
              </div>
            </div>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto min-h-[calc(100vh-4rem)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {activeTab === 'browse' && <BrowseTab />}
              {activeTab === 'my-orders' && <MyOrdersTab />}
              {activeTab === 'wallet' && <WalletTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-white/5"
        style={{
          background: 'rgba(10,5,20,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all duration-200
                ${isActive ? 'text-violet-400' : 'text-white/40'}
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute top-0 h-0.5 w-12 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="lg:hidden h-16" />
    </div>
  )
}

// ==================== BROWSE TAB ====================
function BrowseTab() {
  const { fetchUser } = useAuthStore()
  const [services, setServices] = useState<ServiceItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [buyCountry, setBuyCountry] = useState('')
  const [buying, setBuying] = useState(false)
  const [buyResult, setBuyResult] = useState<{
    phone: string
    provider?: string
    orderId?: string
    message?: string
  } | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' }
      if (search) params.search = search
      if (country) params.country = country
      const data = await api.get<PaginatedResponse<ServiceItem>>('/api/services', params)
      let filtered = data.data

      if (categoryFilter !== 'all') {
        filtered = filtered.filter(
          (s) => s.category.toLowerCase() === categoryFilter.toLowerCase()
        )
      }

      if (sortBy === 'price-low') {
        filtered = [...filtered].sort((a, b) => a.minPrice - b.minPrice)
      } else if (sortBy === 'price-high') {
        filtered = [...filtered].sort((a, b) => b.minPrice - a.minPrice)
      } else if (sortBy === 'popular') {
        filtered = [...filtered].sort((a, b) => b.popularity - a.popularity)
      } else if (sortBy === 'name') {
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
      }

      setServices(filtered)
      setTotal(data.pagination.total)
    } catch {
      toast.error('Failed to load services')
    } finally {
      setLoading(false)
    }
  }, [page, search, country, categoryFilter, sortBy])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const handleBuy = async () => {
    if (!selectedService || !buyCountry) return
    setBuying(true)
    setBuyResult(null)
    try {
      const data = await api.post<{
        data: {
          order: {
            id: string
            phoneNumber: string
            providerName: string
            routing: {
              totalProviders: number
              selectedProvider: string
              triedProviders: Array<{ providerName: string; success: boolean; error?: string }>
            }
          }
          message: string
          newBalance: number
        }
      }>('/api/orders/buy', {
        serviceId: selectedService.id,
        countryCode: buyCountry,
      })
      setBuyResult({
        phone: data.data.order.phoneNumber,
        provider: data.data.order.routing?.selectedProvider,
        orderId: data.data.order.id,
        message: data.message,
      })
      setCountdown(1200) // 20 minutes
      toast.success(data.message)
      // Refresh user balance in the header
      fetchUser().catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setBuying(false)
    }
  }

  // Buy result countdown
  useEffect(() => {
    if (countdown === null) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const allCategories = ['all', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))]

  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'name', label: 'Name A-Z' },
  ]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white/90 tracking-tight">
          Browse Services
        </h2>
        <p className="text-white/40 mt-1">
          Find and purchase SMS verification numbers from top providers
        </p>
      </div>

      {/* Search & Filters Bar */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-col sm:flex-row">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-white/30" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 text-white placeholder-white/30 focus:border-violet-500/50 outline-none transition-colors text-sm"
            />
          </div>
          {/* Sort dropdown */}
          <div className="relative flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-white/30 absolute left-3 pointer-events-none z-10" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-9 text-white text-sm appearance-none cursor-pointer focus:border-violet-500/50 outline-none transition-colors min-w-[160px]"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1a1030] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {/* Sync button */}
          <button
            onClick={() => fetchServices()}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-sm shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat)
                setPage(1)
              }}
              className={`
                px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 border
                ${categoryFilter === cat
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-transparent shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white/70 hover:bg-white/8 hover:border-white/15'
                }
              `}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Service Grid */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={glassCard} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
              <div className="h-3 w-20 rounded bg-white/5 animate-pulse mb-3" />
              <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-6 w-10 rounded-full bg-white/5 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : services.length > 0 ? (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s, index) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedService(s)
                  setBuyCountry('')
                  setBuyResult(null)
                  setCountdown(null)
                }}
              >
                <div
                  style={glassCard}
                  className="p-5 transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-xl group-hover:shadow-violet-500/10 group-hover:border-white/20"
                >
                  {/* Top row: icon + name + badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${getCategoryGradient(s.category)} flex items-center justify-center shrink-0`}
                      >
                        <Layers className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white/90 font-semibold text-sm truncate">
                          {s.name}
                        </h3>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getCategoryBadgeClass(s.category)}`}
                    >
                      {s.category}
                    </span>
                  </div>

                  {/* Price & popularity */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/40 text-xs">
                      {s.availableCountries.length} countries
                    </span>
                    <div className="text-right">
                      <span className="text-white/30 text-xs">From </span>
                      <span className="text-sm font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                        ${s.minPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Country flags row */}
                  <div className="flex flex-wrap gap-1.5">
                    {s.availableCountries.slice(0, 5).map((c) => (
                      <span
                        key={c.country.code}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-white/50 text-xs border border-white/5"
                      >
                        <span className="text-sm leading-none">{c.country.flag}</span>
                        {c.country.code}
                      </span>
                    ))}
                    {s.availableCountries.length > 5 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs border border-white/5">
                        +{s.availableCountries.length - 5}
                      </span>
                    )}
                  </div>

                  {/* Popularity indicator */}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                    <TrendingUp className="h-3.5 w-3.5 text-white/20" />
                    <span className="text-white/25 text-xs">
                      {s.popularity > 0 ? `${s.popularity} orders` : 'New service'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="flex items-center text-sm text-white/40 px-2">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={glassCard} className="p-12 text-center">
          <Layers className="h-12 w-12 text-white/15 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/70">No services available</h3>
          <p className="text-white/30 mt-2 text-sm max-w-md mx-auto">
            Services will appear once providers are configured. Contact admin to set up providers.
          </p>
        </div>
      )}

      {/* ===== SERVICE DETAIL DIALOG ===== */}
      <Dialog
        open={!!selectedService}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedService(null)
            setBuyCountry('')
            setBuyResult(null)
            setCountdown(null)
          }
        }}
      >
        <DialogContent
          className="max-w-lg p-0 gap-0 overflow-hidden"
          style={{
            background: 'rgba(15,10,30,0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
          }}
        >
          <div
            className="p-6 pb-0"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.05) 100%)',
            }}
          >
            <DialogHeader>
              <div className="flex items-start gap-4">
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br ${selectedService ? getCategoryGradient(selectedService.category) : CATEGORY_COLORS.default} flex items-center justify-center shrink-0`}
                >
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-white/90 text-lg">
                    {selectedService?.name}
                  </DialogTitle>
                  <p className="text-white/40 text-sm mt-1">
                    {selectedService?.category}
                    {selectedService?.description && ` — ${selectedService.description}`}
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {selectedService && (
              <>
                {/* Smart routing badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/30 inline-flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    Smart Routing
                  </span>
                  <span className="text-white/40 text-xs">
                    Available in {selectedService.availableCountries.length} countries
                  </span>
                </div>

                <p className="text-xs text-white/30 bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/5">
                  Auto-selects the cheapest provider. Falls back to next if unavailable. Up to 4 providers compared simultaneously.
                </p>

                {/* Country list */}
                <ScrollArea className="max-h-56">
                  <div className="space-y-1.5 pr-2">
                    {selectedService.availableCountries.map((c) => (
                      <div
                        key={c.country.code}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl leading-none shrink-0">{c.country.flag}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white/80">{c.country.name}</div>
                            <div className="text-xs text-white/30">
                              {c.country.phoneCode} · {c.providerCount} provider{c.providerCount > 1 ? 's' : ''} · from {c.providerName}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent shrink-0">
                          ${c.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Country select */}
                <Select value={buyCountry} onValueChange={setBuyCountry}>
                  <SelectTrigger
                    className="bg-white/5 border-white/10 rounded-xl text-white focus:ring-violet-500/30 focus:border-violet-500/50"
                  >
                    <SelectValue placeholder="Select country to buy" />
                  </SelectTrigger>
                  <SelectContent
                    className="bg-[#1a1030] border-white/10 rounded-xl"
                  >
                    {selectedService.availableCountries.map((c) => (
                      <SelectItem
                        key={c.country.code}
                        value={c.country.code}
                        className="text-white/80 focus:bg-white/10 focus:text-white rounded-lg"
                      >
                        {c.country.flag} {c.country.name} — ${c.price.toFixed(2)} ({c.providerCount} provider{c.providerCount > 1 ? 's' : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Buy result */}
                {buyResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span className="text-emerald-300 font-semibold text-sm">Number Purchased!</span>
                    </div>
                    <div className="font-mono text-lg font-bold text-white/90 tracking-wider">
                      {buyResult.phone}
                    </div>
                    {buyResult.provider && (
                      <div className="text-xs text-white/40 mt-1">
                        Via {buyResult.provider}
                      </div>
                    )}
                    {countdown !== null && countdown > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
                        <Clock className="h-3 w-3" />
                        Waiting for SMS... {formatTimer(countdown)}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (buyResult.phone) {
                          navigator.clipboard.writeText(buyResult.phone)
                          toast.success('Phone number copied!')
                        }
                      }}
                      className="mt-2 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copy number
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </div>

          <div
            className="p-5 flex items-center justify-end gap-3 border-t border-white/5"
            style={{
              background: 'rgba(15,10,30,0.6)',
            }}
          >
            <button
              onClick={() => {
                setSelectedService(null)
                setBuyResult(null)
                setCountdown(null)
              }}
              className="px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              disabled={!buyCountry || buying}
              onClick={handleBuy}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
            >
              {buying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding Best Price...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Buy Number
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== MY ORDERS TAB ====================
function MyOrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [checkingSms, setCheckingSms] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // Countdown timers
  const [countdowns, setCountdowns] = useState<Record<string, number>>({})
  const countdownRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Polling refs
  const pollingRef = useRef<Record<string, NodeJS.Timeout>>({})
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set())

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' }
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await api.get<PaginatedResponse<Order>>('/api/orders/my-orders', params)
      setOrders(data.data)
      setTotal(data.pagination.total)

      // Initialize countdowns for ACTIVE orders
      const newCountdowns: Record<string, number> = {}
      data.data.forEach((o) => {
        if (o.status === 'ACTIVE' && o.expiresAt) {
          const remaining = Math.max(
            0,
            Math.floor((new Date(o.expiresAt).getTime() - Date.now()) / 1000)
          )
          newCountdowns[o.id] = remaining
        }
      })
      setCountdowns((prev) => {
        const merged = { ...prev }
        Object.keys(merged).forEach((k) => {
          if (!data.data.find((o) => o.id === k)) delete merged[k]
        })
        return { ...merged, ...newCountdowns }
      })
    } catch {
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Countdown timer: update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns((prev) => {
        const next: Record<string, number> = {}
        let changed = false
        for (const [id, sec] of Object.entries(prev)) {
          if (sec > 0) {
            next[id] = sec - 1
            changed = true
          } else {
            next[id] = 0
          }
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-polling for ACTIVE/PENDING orders every 5 seconds
  useEffect(() => {
    const ordersToPoll = orders.filter(
      (o) => (o.status === 'ACTIVE' || o.status === 'PENDING') && !o.smsCode
    )
    const activeIds = new Set(ordersToPoll.map((o) => o.id))

    ordersToPoll.forEach((o) => {
      if (!pollingRef.current[o.id]) {
        pollingRef.current[o.id] = setInterval(async () => {
          try {
            const data = await api.post<{
              data: {
                orderId: string
                status: string
                smsCode: string | null
                smsText: string | null
                phoneNumber: string | null
                message: string
              }
            }>('/api/orders/check-sms', { orderId: o.id })

            if (data.data.smsCode) {
              toast.success(`SMS Code received: ${data.data.smsCode}`)
              clearInterval(pollingRef.current[o.id])
              delete pollingRef.current[o.id]
              fetchOrders()
            }
          } catch {
            // Silently ignore polling errors
          }
        }, 5000)
      }
    })

    setPollingIds((prev) => {
      const next = new Set(prev)
      for (const id of next) {
        if (!activeIds.has(id)) {
          clearInterval(pollingRef.current[id])
          delete pollingRef.current[id]
          next.delete(id)
        }
      }
      for (const id of activeIds) {
        next.add(id)
      }
      return next
    })

    return () => {
      Object.values(pollingRef.current).forEach(clearInterval)
    }
  }, [orders, fetchOrders])

  const checkSms = async (orderId: string) => {
    setCheckingSms(orderId)
    try {
      const data = await api.post<{
        data: {
          orderId: string
          status: string
          smsCode: string | null
          smsText: string | null
          phoneNumber: string | null
          message: string
        }
      }>('/api/orders/check-sms', { orderId })
      toast.info(data.data.message)
      if (data.data.smsCode) {
        toast.success(`SMS Code: ${data.data.smsCode}`)
      }
      fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to check SMS')
    } finally {
      setCheckingSms(null)
    }
  }

  const cancelOrder = async (orderId: string) => {
    try {
      await api.post('/api/orders/cancel', { orderId })
      toast.success('Order cancelled')
      if (pollingRef.current[orderId]) {
        clearInterval(pollingRef.current[orderId])
        delete pollingRef.current[orderId]
      }
      fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order')
    }
  }

  const copySmsCode = async (code: string, orderId: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(orderId)
      toast.success('Copied!')
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const getCountdownColor = (seconds: number): string => {
    if (seconds === 0) return 'text-white/30'
    if (seconds > 600) return 'text-green-400'
    if (seconds > 300) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ACTIVE': return '#22c55e'
      case 'COMPLETED': return '#06b6d4'
      case 'PENDING': return '#f59e0b'
      case 'CANCELLED': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusBg = (status: string): string => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/15 text-green-400 border-green-500/30'
      case 'COMPLETED': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
      case 'PENDING': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      case 'CANCELLED': return 'bg-red-500/15 text-red-400 border-red-500/30'
      default: return 'bg-white/5 text-white/40 border-white/10'
    }
  }

  // Stats
  const activeOrders = orders.filter((o) => o.status === 'ACTIVE' || o.status === 'PENDING').length
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length
  const totalOrders = orders.length
  const successRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0
  const totalSpent = orders.reduce((sum, o) => sum + (o.transaction?.amount ?? 0), 0)

  const filterTabs = [
    { value: 'all', label: 'All' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white/90 tracking-tight">
            My Orders
          </h2>
          <p className="text-white/40 mt-1">Track and manage your SMS verification orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div style={glassCard} className="p-4">
          <div className="text-white/30 text-xs mb-1">Active</div>
          <div className="text-white/90 text-xl font-bold">{activeOrders}</div>
          {activeOrders > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-green-400 text-xs">Live</span>
            </div>
          )}
        </div>
        <div style={glassCard} className="p-4">
          <div className="text-white/30 text-xs mb-1">Total Orders</div>
          <div className="text-white/90 text-xl font-bold">{total}</div>
        </div>
        <div style={glassCard} className="p-4">
          <div className="text-white/30 text-xs mb-1">Total Spent</div>
          <div className="text-white/90 text-xl font-bold">
            ${Math.abs(totalSpent).toFixed(2)}
          </div>
        </div>
        <div style={glassCard} className="p-4">
          <div className="text-white/30 text-xs mb-1">Success Rate</div>
          <div className="text-white/90 text-xl font-bold">{successRate}%</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 overflow-x-auto">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value)
              setPage(1)
            }}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0
              ${statusFilter === tab.value
                ? 'bg-gradient-to-r from-violet-600/20 to-cyan-600/10 text-white border border-violet-500/30'
                : 'text-white/40 hover:text-white/60 border border-transparent hover:bg-white/5'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={glassCard} className="p-5">
              <div className="flex gap-4">
                <div className="w-1 h-16 rounded-full bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-white/5 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence>
            {orders.map((o, index) => {
              const isExpired = o.status === 'ACTIVE' && countdowns[o.id] !== undefined && countdowns[o.id] === 0
              const isActiveOrPending = (o.status === 'ACTIVE' || o.status === 'PENDING') && !o.smsCode
              const isExpanded = expandedOrder === o.id

              return (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <div
                    style={glassCard}
                    className={`overflow-hidden transition-all duration-200 ${isExpired ? 'opacity-50' : ''}`}
                  >
                    <div className="flex">
                      {/* Status indicator bar */}
                      <div
                        className="w-1.5 shrink-0"
                        style={{ backgroundColor: getStatusColor(o.status) }}
                      />

                      <div className="flex-1 p-4 md:p-5">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                o.status === 'COMPLETED'
                                  ? 'bg-cyan-500/15'
                                  : o.status === 'ACTIVE'
                                  ? 'bg-green-500/15'
                                  : o.status === 'PENDING'
                                  ? 'bg-amber-500/15'
                                  : 'bg-red-500/15'
                              }`}
                            >
                              {o.status === 'COMPLETED' ? (
                                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                              ) : o.status === 'ACTIVE' ? (
                                <Phone className="h-5 w-5 text-green-400" />
                              ) : o.status === 'PENDING' ? (
                                <Clock className="h-5 w-5 text-amber-400" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-white/90 font-semibold text-sm truncate">
                                {o.providerService?.service?.name ?? 'Unknown'}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBg(o.status)}`}
                                >
                                  {isExpired ? 'Expired' : o.status}
                                </span>
                                {isActiveOrPending && (
                                  <span className="flex items-center gap-1 text-xs text-blue-400">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                                    </span>
                                    Auto-polling
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Countdown timer */}
                          {o.status === 'ACTIVE' && o.expiresAt && countdowns[o.id] !== undefined && (
                            <div className="text-right shrink-0">
                              <div className={`font-mono text-lg font-bold ${getCountdownColor(countdowns[o.id])}`}>
                                {isExpired ? 'Expired' : formatCountdown(countdowns[o.id])}
                              </div>
                              <div className="text-white/20 text-xs">Time left</div>
                            </div>
                          )}

                          {/* Expand button */}
                          <button
                            onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                            className="text-white/30 hover:text-white/60 p-1 rounded-lg hover:bg-white/5 transition-all shrink-0"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>

                        {/* Phone number & SMS Code */}
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Phone number */}
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-white/30" />
                            <span className="font-mono text-sm text-white/70">
                              {o.phoneNumber ?? '—'}
                            </span>
                          </div>

                          {/* SMS Code */}
                          {o.smsCode ? (
                            <div className="flex items-center gap-2">
                              <span className="text-white/20 text-xs">SMS:</span>
                              <span className="font-mono text-xl font-bold tracking-wider bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                                {o.smsCode}
                              </span>
                              <button
                                onClick={() => copySmsCode(o.smsCode!, o.id)}
                                className="text-white/30 hover:text-violet-400 transition-colors p-1 rounded-lg hover:bg-white/5"
                                title="Copy code"
                              >
                                {copiedId === o.id ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          ) : isActiveOrPending ? (
                            <div className="flex items-center gap-1.5 text-white/30 text-xs">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Waiting for SMS...
                            </div>
                          ) : null}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                          {(o.status === 'ACTIVE' || o.status === 'PENDING') && (
                            <>
                              <button
                                onClick={() => checkSms(o.id)}
                                disabled={checkingSms === o.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 border border-white/10 transition-all disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {checkingSms === o.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                                Check SMS
                              </button>
                              <button
                                onClick={() => cancelOrder(o.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/5 border border-red-500/20 transition-all flex items-center gap-1.5"
                              >
                                <XCircle className="h-3 w-3" />
                                Cancel
                              </button>
                            </>
                          )}
                          <div className="flex-1" />
                          <span className="text-white/20 text-xs hidden sm:inline-block">
                            {new Date(o.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-white/25 text-xs block">Order ID</span>
                                    <span className="text-white/50 font-mono text-xs">{o.id.slice(0, 16)}...</span>
                                  </div>
                                  <div>
                                    <span className="text-white/25 text-xs block">Status</span>
                                    <span className="text-white/50 text-xs">{o.status}</span>
                                  </div>
                                  <div>
                                    <span className="text-white/25 text-xs block">Created</span>
                                    <span className="text-white/50 text-xs">{new Date(o.createdAt).toLocaleString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-white/25 text-xs block">Expires</span>
                                    <span className="text-white/50 text-xs">
                                      {o.expiresAt ? new Date(o.expiresAt).toLocaleString() : '—'}
                                    </span>
                                  </div>
                                  {o.transaction && (
                                    <div>
                                      <span className="text-white/25 text-xs block">Amount</span>
                                      <span className="text-white/50 text-xs">
                                        ${Math.abs(o.transaction.amount).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  {o.completedAt && (
                                    <div>
                                      <span className="text-white/25 text-xs block">Completed</span>
                                      <span className="text-white/50 text-xs">
                                        {new Date(o.completedAt).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {o.smsText && (
                                    <div className="col-span-2">
                                      <span className="text-white/25 text-xs block">Full SMS Text</span>
                                      <span className="text-white/50 text-xs">{o.smsText}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div style={glassCard} className="p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-white/15 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/70">No orders yet</h3>
          <p className="text-white/30 mt-2 text-sm max-w-md mx-auto">
            Browse services and purchase a number to get started. Your orders will appear here.
          </p>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="flex items-center text-sm text-white/40 px-2">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
