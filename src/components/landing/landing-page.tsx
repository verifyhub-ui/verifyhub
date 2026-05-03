'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, Globe, Shield, Zap, Headphones, BadgeDollarSign, Code,
  Search, MessageSquare, Star, ArrowRight, Menu, X,
  Users, CreditCard, Clock, CheckCircle2, ChevronRight,
  Filter, Tag, MapPin, ChevronDown, ChevronUp,
  Loader2, ShoppingBag, LayoutGrid, List, TrendingUp
} from 'lucide-react'

// ==================== ICON MAP ====================
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Phone, Globe, Shield, Zap, Headphones, BadgeDollarSign, Code,
  Search, MessageSquare, Star, ArrowRight, Users, CreditCard, Clock,
  CheckCircle2, ChevronRight, Filter, Tag, MapPin, TrendingUp,
}

function getIcon(name: string) {
  return ICON_MAP[name] || Phone
}

// ==================== TYPES ====================
interface LandingContent {
  hero: {
    title: string
    subtitle: string
    description: string
    ctaText: string
    showStats: boolean
  }
  stats: { value: string; label: string }[]
  howItWorks: {
    title: string
    subtitle: string
    steps: { title: string; description: string; icon: string }[]
  }
  features: {
    title: string
    subtitle: string
    items: { title: string; description: string; icon: string; color: string }[]
  }
  cta: {
    title: string
    subtitle: string
    buttonText: string
  }
  footer: {
    description: string
    copyright: string
    links: { label: string; url: string }[]
  }
}

interface ServiceCountry {
  country: { name: string; code: string; phoneCode: string; flag: string | null }
  price: number
  providerName: string
  providerCount: number
}

interface ServiceItem {
  id: string
  name: string
  slug: string
  category: string
  description: string | null
  popularity: number
  minPrice: number
  availableCountries: ServiceCountry[]
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ==================== DEFAULT CONTENT ====================
const DEFAULT_CONTENT: LandingContent = {
  hero: {
    title: 'Buy Virtual Phone Numbers for SMS Verification',
    subtitle: 'Instant numbers from 150+ countries. Starting at $0.10',
    description: 'Get instant temporary phone numbers for SMS verification across 150+ countries. Fast, reliable, and affordable.',
    ctaText: 'Get Started Free',
    showStats: true,
  },
  stats: [
    { value: '10,000+', label: 'Users' },
    { value: '150+', label: 'Countries' },
    { value: '24/7', label: 'Support' },
    { value: '99.9%', label: 'Uptime' },
  ],
  howItWorks: {
    title: 'How It Works',
    subtitle: 'Get your virtual number in three simple steps',
    steps: [
      { title: 'Choose Service', description: 'Select the platform you need to verify your account on', icon: 'Search' },
      { title: 'Get Number', description: 'Receive a temporary phone number instantly', icon: 'Phone' },
      { title: 'Receive SMS', description: 'Get your verification code within seconds', icon: 'MessageSquare' },
    ],
  },
  features: {
    title: 'Why Choose VerifyHub?',
    subtitle: 'Everything you need for seamless SMS verification',
    items: [
      { title: 'Instant Activation', description: 'Numbers ready to use in seconds, no waiting required', icon: 'Zap', color: 'violet' },
      { title: 'Global Coverage', description: 'Access numbers from 150+ countries worldwide', icon: 'Globe', color: 'cyan' },
      { title: 'Secure & Private', description: 'Your data is encrypted and never shared', icon: 'Shield', color: 'pink' },
      { title: '24/7 Support', description: 'Our team is always here to help you', icon: 'Headphones', color: 'orange' },
      { title: 'Best Prices', description: 'Most competitive rates in the market', icon: 'BadgeDollarSign', color: 'emerald' },
      { title: 'API Access', description: 'Easy integration with your applications', icon: 'Code', color: 'blue' },
    ],
  },
  cta: {
    title: 'Ready to Get Started?',
    subtitle: 'Join thousands of users who trust VerifyHub for their verification needs. Create your free account today.',
    buttonText: 'Create Free Account',
  },
  footer: {
    description: 'VerifyHub is the leading platform for virtual phone numbers and SMS verification services worldwide.',
    copyright: '© 2025 VerifyHub. All rights reserved.',
    links: [
      { label: 'Privacy Policy', url: '#' },
      { label: 'Terms of Service', url: '#' },
      { label: 'Contact Us', url: '#' },
    ],
  },
}

// ==================== CATEGORIES ====================
const CATEGORIES = [
  { label: 'All Services', value: '' },
  { label: 'Social Media', value: 'Social' },
  { label: 'Email', value: 'Email' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Shopping', value: 'Shopping' },
  { label: 'Gaming', value: 'Gaming' },
  { label: 'Other', value: 'Other' },
]

const CATEGORY_ICONS: Record<string, string> = {
  'Social': 'Users',
  'Email': 'MessageSquare',
  'Finance': 'CreditCard',
  'Shopping': 'ShoppingBag',
  'Gaming': 'Zap',
  'Other': 'Tag',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Social': 'rgba(168, 85, 247, 0.15)',
  'Email': 'rgba(6, 182, 212, 0.15)',
  'Finance': 'rgba(16, 185, 129, 0.15)',
  'Shopping': 'rgba(249, 115, 22, 0.15)',
  'Gaming': 'rgba(236, 72, 153, 0.15)',
  'Other': 'rgba(148, 163, 184, 0.15)',
}

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  'Social': '#a855f7',
  'Email': '#06b6d4',
  'Finance': '#10b981',
  'Shopping': '#f97316',
  'Gaming': '#ec4899',
  'Other': '#94a3b8',
}

// ==================== ANIMATIONS ====================
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
  }),
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

// ==================== HELPERS ====================
function mergeContent(apiData: Partial<LandingContent>): LandingContent {
  return {
    hero: { ...DEFAULT_CONTENT.hero, ...apiData.hero },
    stats: apiData.stats?.length ? apiData.stats : DEFAULT_CONTENT.stats,
    howItWorks: {
      ...DEFAULT_CONTENT.howItWorks,
      ...apiData.howItWorks,
      steps: apiData.howItWorks?.steps?.length
        ? apiData.howItWorks.steps
        : DEFAULT_CONTENT.howItWorks.steps,
    },
    features: {
      ...DEFAULT_CONTENT.features,
      ...apiData.features,
      items: apiData.features?.items?.length
        ? apiData.features.items
        : DEFAULT_CONTENT.features.items,
    },
    cta: { ...DEFAULT_CONTENT.cta, ...apiData.cta },
    footer: {
      ...DEFAULT_CONTENT.footer,
      ...apiData.footer,
      links: apiData.footer?.links?.length
        ? apiData.footer.links
        : DEFAULT_CONTENT.footer.links,
    },
  }
}

function getCountryFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

function AnimatedCounter({ value, label }: { value: string; label: string }) {
  const numericVal = parseFloat(value.replace(/[^0-9.]/g, ''))
  const suffix = value.replace(/[0-9.]/g, '')
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (isNaN(numericVal)) return
    const duration = 2000
    const steps = 60
    const increment = numericVal / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= numericVal) {
        setCount(numericVal)
        clearInterval(timer)
      } else {
        setCount(current)
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [numericVal])

  const displayVal = isNaN(numericVal)
    ? value
    : (Number.isInteger(numericVal) ? Math.floor(count) : count.toFixed(1)) + suffix

  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-bold gradient-text">{displayVal}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  )
}

// ==================== SERVICE DETAIL MODAL ====================
function ServiceModal({
  service,
  onClose,
  onBuy,
  isAuthenticated,
  onLoginClick,
}: {
  service: ServiceItem
  onClose: () => void
  onBuy: () => void
  isAuthenticated?: boolean
  onLoginClick: () => void
}) {
  const [sortBy, setSortBy] = useState<'price' | 'name'>('price')

  const sortedCountries = useMemo(() => {
    const countries = [...service.availableCountries]
    if (sortBy === 'price') {
      countries.sort((a, b) => a.price - b.price)
    } else {
      countries.sort((a, b) => a.country.name.localeCompare(b.country.name))
    }
    return countries
  }, [service.availableCountries, sortBy])

  const handleBuy = () => {
    onClose()
    if (isAuthenticated) {
      onBuy()
    } else {
      onLoginClick()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl max-h-[85vh] glass-card-static overflow-hidden flex flex-col"
        style={{ borderRadius: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: CATEGORY_COLORS[service.category] || 'rgba(148, 163, 184, 0.15)' }}
            >
              <span className="text-lg">{getCountryFlag(service.category === 'Social' ? 'US' : 'GB')}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{service.name}</h3>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: CATEGORY_COLORS[service.category] || 'rgba(148, 163, 184, 0.15)',
                  color: CATEGORY_TEXT_COLORS[service.category] || '#94a3b8',
                }}
              >
                {service.category}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Sort Controls */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-gray-400">{sortedCountries.length} countries available</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('price')}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                sortBy === 'price'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              Sort by Price
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                sortBy === 'name'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              Sort by Name
            </button>
          </div>
        </div>

        {/* Country List */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4">
          <div className="space-y-2">
            {sortedCountries.map((item, idx) => (
              <motion.div
                key={item.country.code}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">{item.country.flag || getCountryFlag(item.country.code)}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.country.name}</div>
                    <div className="text-xs text-gray-500">{item.country.phoneCode} &middot; {item.providerCount} provider{item.providerCount !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold text-emerald-400">${item.price.toFixed(2)}</span>
                  <button
                    onClick={handleBuy}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500"
                  >
                    Buy
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between flex-shrink-0 bg-white/[0.02]">
          <div className="text-sm text-gray-400">
            Starting from <span className="text-emerald-400 font-bold">${service.minPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={handleBuy}
            className="btn-glow px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium rounded-xl text-sm flex items-center gap-2"
          >
            {isAuthenticated ? 'Buy Number' : 'Sign In to Buy'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ==================== MAIN COMPONENT ====================
export function LandingPage({ onLoginClick, isAuthenticated, onGoToDashboard }: {
  onLoginClick: () => void
  isAuthenticated?: boolean
  onGoToDashboard?: () => void
}) {
  const [content, setContent] = useState<LandingContent>(DEFAULT_CONTENT)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Marketplace state
  const [services, setServices] = useState<ServiceItem[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [navSearchQuery, setNavSearchQuery] = useState('')

  // Fetch CMS content
  useEffect(() => {
    fetch('/api/landing')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setContent(mergeContent(data.data))
        }
      })
      .catch(() => {})
  }, [])

  // Fetch services
  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (selectedCategory) params.set('category', selectedCategory)
      const res = await fetch(`/api/public/services?${params.toString()}`)
      const json = await res.json()
      if (json.data) {
        setServices(json.data)
        setPagination(json.pagination)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Client-side filtering by search query
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services
    const q = searchQuery.toLowerCase()
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.availableCountries.some(
          (c) => c.country.name.toLowerCase().includes(q) || c.country.code.toLowerCase().includes(q)
        )
    )
  }, [services, searchQuery])

  // Popular countries for right sidebar
  const popularCountries = useMemo(() => {
    const countryCount = new Map<string, { name: string; code: string; flag: string | null; count: number; minPrice: number }>()
    for (const service of services) {
      for (const ac of service.availableCountries) {
        const existing = countryCount.get(ac.country.code)
        if (!existing) {
          countryCount.set(ac.country.code, {
            name: ac.country.name,
            code: ac.country.code,
            flag: ac.country.flag,
            count: 1,
            minPrice: ac.price,
          })
        } else {
          existing.count++
          existing.minPrice = Math.min(existing.minPrice, ac.price)
        }
      }
    }
    return Array.from(countryCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [services])

  // Get unique categories from services
  const activeCategories = useMemo(() => {
    const cats = new Set(services.map((s) => s.category))
    return CATEGORIES.filter((c) => !c.value || cats.has(c.value))
  }, [services])

  // Nav search handler
  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (navSearchQuery.trim()) {
      setSearchQuery(navSearchQuery.trim())
      setSelectedCategory('')
      const marketplace = document.getElementById('marketplace')
      if (marketplace) {
        marketplace.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <div className="landing-root">
      {/* ==================== NAVIGATION ==================== */}
      <nav className={`landing-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:block">VerifyHub</span>
              <span className="text-xl font-bold gradient-text sm:hidden">VH</span>
            </motion.div>

            {/* Center Search Bar (Desktop) */}
            <form onSubmit={handleNavSearch} className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  placeholder="Search services, countries..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.08] transition-all"
                />
              </div>
            </form>

            {/* Desktop Nav */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:flex items-center gap-6"
            >
              <a href="#marketplace" className="text-gray-300 hover:text-white transition-colors text-sm">Services</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors text-sm">How It Works</a>
              <a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm">Pricing</a>
              {isAuthenticated && onGoToDashboard ? (
                <button
                  onClick={onGoToDashboard}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full hover:from-emerald-500 hover:to-teal-500 transition-all hover:scale-105"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full hover:from-violet-500 hover:to-cyan-500 transition-all hover:scale-105"
                >
                  Sign In
                </button>
              )}
            </motion.div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-white flex-shrink-0">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden mt-4 pb-4 border-t border-white/10 pt-4 overflow-hidden"
              >
                <form onSubmit={handleNavSearch} className="mb-4">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={navSearchQuery}
                      onChange={(e) => setNavSearchQuery(e.target.value)}
                      placeholder="Search services, countries..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-all"
                    />
                  </div>
                </form>
                <div className="flex flex-col gap-3">
                  <a href="#marketplace" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2">Services</a>
                  <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2">How It Works</a>
                  <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2">Pricing</a>
                  {isAuthenticated && onGoToDashboard ? (
                    <button
                      onClick={() => { setMobileMenuOpen(false); onGoToDashboard() }}
                      className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full mt-2"
                    >
                      Dashboard
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMobileMenuOpen(false); onLoginClick() }}
                      className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full mt-2"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative pt-28 pb-12 sm:pt-32 sm:pb-16 overflow-hidden">
        <div className="orb orb-1" />
        <div className="orb orb-2" style={{ opacity: 0.2 }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Trusted by {content.stats[0]?.value || '10K+'} users worldwide
            </motion.div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
              <span className="gradient-text">{content.hero.title}</span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base sm:text-lg md:text-xl text-violet-300 font-medium mb-2"
            >
              {content.hero.subtitle}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mb-6"
            >
              {content.hero.description}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8"
            >
              <button
                onClick={onLoginClick}
                className="btn-glow px-7 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold rounded-xl text-base flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#marketplace"
                className="px-7 py-3 border border-white/20 text-gray-300 font-medium rounded-xl text-base hover:bg-white/5 transition-all w-full sm:w-auto text-center"
              >
                Browse Numbers
              </a>
            </motion.div>

            {/* Quick Stats */}
            {content.hero.showStats && content.stats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="flex flex-wrap justify-center gap-6 sm:gap-10"
              >
                {content.stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">|</span>
                    <span className="text-white font-bold">{stat.value}</span>
                    <span className="text-gray-500">{stat.label}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ==================== SERVICES MARKETPLACE ==================== */}
      <section id="marketplace" className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="mb-8"
          >
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 text-center">
              Live Service Marketplace
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-center text-sm sm:text-base">
              Browse {pagination.total} services across {popularCountries.length}+ countries
            </motion.p>
          </motion.div>

          {/* Mobile: Horizontal Category Filter Chips */}
          <div className="lg:hidden mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar -mx-4 px-4">
              {activeCategories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    selectedCategory === cat.value
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                      : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  {cat.value && CATEGORY_ICONS[cat.value] && (
                    <span className="text-xs">{React.createElement(getIcon(CATEGORY_ICONS[cat.value]), { className: 'w-3.5 h-3.5' })}</span>
                  )}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            {/* ===== LEFT SIDEBAR (Desktop) ===== */}
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="glass-card-static p-4 sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-white">Categories</h3>
                </div>
                <div className="space-y-1">
                  {activeCategories.map((cat) => {
                    const count = cat.value
                      ? services.filter((s) => s.category === cat.value).length
                      : services.length
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                          selectedCategory === cat.value
                            ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                            : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {cat.value && CATEGORY_ICONS[cat.value] && (
                            <span className="text-xs">{React.createElement(getIcon(CATEGORY_ICONS[cat.value]), { className: 'w-3.5 h-3.5' })}</span>
                          )}
                          <span>{cat.label}</span>
                        </div>
                        <span className="text-xs bg-white/[0.06] px-2 py-0.5 rounded-full">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>

            {/* ===== MAIN SERVICES AREA ===== */}
            <main className="flex-1 min-w-0">
              {/* Search + View controls */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services or countries..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-1 flex-shrink-0">
                  <LayoutGrid className="w-4 h-4" />
                  {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-4" />
                  <p className="text-gray-400 text-sm">Loading services...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Search className="w-10 h-10 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-sm mb-1">No services found</p>
                  <p className="text-gray-600 text-xs">Try adjusting your search or category filter</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('') }}
                    className="mt-4 px-4 py-2 text-sm rounded-lg bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] transition-all"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                  {filteredServices.map((service, idx) => (
                    <motion.div
                      key={service.id}
                      variants={fadeUp}
                      custom={Math.min(idx, 15)}
                      className="glass-card p-4 group cursor-pointer"
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-bold text-white truncate">{service.name}</h3>
                          </div>
                          <span
                            className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: CATEGORY_COLORS[service.category] || 'rgba(148, 163, 184, 0.15)',
                              color: CATEGORY_TEXT_COLORS[service.category] || '#94a3b8',
                            }}
                          >
                            {service.category}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className="text-lg font-bold text-emerald-400">${service.minPrice.toFixed(2)}</div>
                          <div className="text-[10px] text-gray-500">from</div>
                        </div>
                      </div>

                      {/* Top Countries Preview */}
                      <div className="flex items-center gap-1 mb-3 flex-wrap">
                        {service.availableCountries.slice(0, 5).map((ac) => (
                          <span
                            key={ac.country.code}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded-md"
                          >
                            <span className="text-xs">{ac.country.flag || getCountryFlag(ac.country.code)}</span>
                            {ac.country.code}
                          </span>
                        ))}
                        {service.availableCountries.length > 5 && (
                          <span className="text-[11px] text-gray-500">+{service.availableCountries.length - 5}</span>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                        <span className="text-xs text-gray-500">
                          {service.availableCountries.length} countr{service.availableCountries.length !== 1 ? 'ies' : 'y'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedService(service)
                          }}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white opacity-80 group-hover:opacity-100 transition-all hover:scale-105"
                        >
                          View
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Load More */}
              {!loading && filteredServices.length > 0 && pagination.page < pagination.totalPages && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('')
                    }}
                    className="px-6 py-2.5 text-sm font-medium rounded-xl bg-white/[0.05] text-gray-300 border border-white/[0.08] hover:bg-white/[0.08] transition-all"
                  >
                    View All Services
                  </button>
                </div>
              )}
            </main>

            {/* ===== RIGHT SIDEBAR (Desktop) ===== */}
            <aside className="hidden xl:block w-56 flex-shrink-0">
              <div className="glass-card-static p-4 sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Popular Countries</h3>
                </div>
                <div className="space-y-1.5">
                  {popularCountries.map((country, idx) => (
                    <div
                      key={country.code}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-default"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{country.flag || getCountryFlag(country.code)}</span>
                        <span className="text-xs text-gray-300 truncate">{country.name}</span>
                      </div>
                      <span className="text-[11px] text-gray-500 flex-shrink-0 ml-2">${country.minPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Quick CTA */}
                <div className="mt-6 p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/10">
                  <p className="text-xs text-gray-400 mb-2">Need a specific number?</p>
                  <button
                    onClick={onLoginClick}
                    className="w-full text-xs font-medium py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 transition-all"
                  >
                    Sign In & Buy
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              {content.howItWorks.title}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              {content.howItWorks.subtitle}
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-px bg-gradient-to-r from-violet-500/50 via-cyan-500/50 to-pink-500/50" />

            {content.howItWorks.steps.map((step, i) => {
              const IconComp = getIcon(step.icon)
              const gradients = [
                'from-violet-500 to-purple-600',
                'from-cyan-500 to-blue-600',
                'from-pink-500 to-rose-600',
              ]
              return (
                <motion.div
                  key={i}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-50px' }}
                  variants={fadeUp}
                >
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="glass-card p-8 text-center relative"
                  >
                    <div className="flex justify-center mb-6 relative z-10">
                      <div className={`step-circle bg-gradient-to-br ${gradients[i]} text-white`}>
                        <IconComp className="w-7 h-7" />
                      </div>
                    </div>
                    <div className="text-xs font-bold text-violet-400 mb-2">STEP {i + 1}</div>
                    <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{step.description}</p>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section id="features" className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="orb orb-2" style={{ top: '10%', right: '-200px', opacity: 0.2 }} />
        <div className="orb orb-4" style={{ bottom: '10%', left: '-200px', opacity: 0.2 }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              {content.features.title}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              {content.features.subtitle}
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {content.features.items.map((feature, i) => {
              const IconComp = getIcon(feature.icon)
              const glowColors = ['glow-violet', 'glow-cyan', 'glow-pink', 'glow-orange', 'stat-glow-3', 'stat-glow-4']
              return (
                <motion.div
                  key={i}
                  custom={i}
                  variants={fadeUp}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className={`glass-card p-6 ${glowColors[i % glowColors.length]}`}
                >
                  <div className={`w-12 h-12 rounded-xl icon-bg-${feature.color} flex items-center justify-center mb-4`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ==================== CTA SECTION ==================== */}
      <section className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={scaleIn}
            className="gradient-border"
          >
            <div className="glass-card-static p-10 sm:p-16 text-center relative overflow-hidden">
              <div className="orb orb-1" style={{ width: '200px', height: '200px', top: '-60px', right: '-60px', opacity: 0.2 }} />
              <div className="orb orb-2" style={{ width: '200px', height: '200px', bottom: '-60px', left: '-60px', opacity: 0.2 }} />

              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                  {content.cta.title}
                </h2>
                <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
                  {content.cta.subtitle}
                </p>
                <button
                  onClick={onLoginClick}
                  className="btn-glow px-10 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold rounded-2xl text-lg inline-flex items-center gap-2 pulse-glow"
                >
                  {content.cta.buttonText}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="landing-footer py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">VerifyHub</span>
            </div>
            <p className="text-gray-500 text-sm text-center">{content.footer.description}</p>
            <div className="flex flex-wrap gap-4 md:justify-end">
              {content.footer.links.map((link, i) => (
                <a key={i} href={link.url} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-600 text-sm">{content.footer.copyright}</p>
          </div>
        </div>
      </footer>

      {/* ==================== SERVICE MODAL ==================== */}
      <AnimatePresence>
        {selectedService && (
          <ServiceModal
            service={selectedService}
            onClose={() => setSelectedService(null)}
            onBuy={() => {
              if (isAuthenticated && onGoToDashboard) {
                onGoToDashboard()
              } else {
                onLoginClick()
              }
            }}
            isAuthenticated={isAuthenticated}
            onLoginClick={onLoginClick}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
