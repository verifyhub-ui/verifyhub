'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { api, type User, type DashboardStats, type PaginatedResponse, type Order, type Service, type Provider, type Transaction } from '@/lib/api'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LayoutDashboard, Users, ShoppingCart, Layers, Server, LogOut, RefreshCw, MoreVertical,
  Search, DollarSign, Activity, TrendingUp, Plus, Ban, Eye, Pencil, Trash2, Shield,
  Zap, Wallet, CreditCard, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle,
  Percent, Bell, ChevronRight, BarChart3, Settings, Globe, Palette, Save, RotateCcw,
  PlusCircle, Trash, FileText, MessageSquareText, Sparkles, Layout, Star, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { SettingsTab, FundRequestsTab } from './admin-extra-tabs'

// ==================== TYPES ====================

type AdminTab = 'overview' | 'users' | 'orders' | 'services' | 'providers' | 'finance' | 'settings' | 'landing'

interface LandingContent {
  hero: { title: string; subtitle: string; description: string; ctaText: string; showStats: boolean }
  stats: { value: string; label: string }[]
  howItWorks: { title: string; subtitle: string; steps: { title: string; description: string; icon: string }[] }
  features: { title: string; subtitle: string; items: { title: string; description: string; icon: string; color: string }[] }
  testimonials: { title: string; subtitle: string; items: { name: string; role: string; text: string; initials: string; rating: number }[] }
  cta: { title: string; subtitle: string; buttonText: string }
  footer: { description: string; copyright: string; links: { label: string; url: string }[] }
}

const DEFAULT_CONTENT: LandingContent = {
  hero: {
    title: 'Virtual Phone Numbers',
    subtitle: 'SMS Verification',
    description: 'Get instant temporary phone numbers for SMS verification across 150+ countries. Fast, reliable, and affordable.',
    ctaText: 'Get Started Free',
    showStats: true,
  },
  stats: [
    { value: '150+', label: 'Countries' },
    { value: '5000+', label: 'Active Numbers' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' },
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
  testimonials: {
    title: 'Trusted by Thousands',
    subtitle: 'See what our users say about VerifyHub',
    items: [
      { name: 'Alex Johnson', role: 'Full-Stack Developer', text: "VerifyHub is the best SMS verification service I've ever used. Fast, reliable, and the API integration was a breeze.", initials: 'AJ', rating: 5 },
      { name: 'Sarah Chen', role: 'Business Owner', text: 'We use VerifyHub for all our client verifications. The uptime is incredible and the pricing is very competitive.', initials: 'SC', rating: 5 },
      { name: 'Mike Davis', role: 'Digital Marketer', text: 'Great service with excellent customer support. Numbers are delivered instantly and work perfectly every time.', initials: 'MD', rating: 5 },
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

// ==================== ANIMATION VARIANTS ====================

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.35, ease: 'easeOut' as const } }
const staggerContainer = { animate: { transition: { staggerChildren: 0.08 } } }

// ==================== STATUS COLORS ====================

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e', COMPLETED: '#06b6d4', PENDING: '#f59e0b', CANCELLED: '#ef4444',
  EXPIRED: '#94a3b8', APPROVED: '#22c55e', REJECTED: '#ef4444',
}

// ==================== STATUS BADGE ====================

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#94a3b8'
  return (
    <span className="dash-badge" style={{ borderColor: `${color}30`, color }}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: color }} />
      {status}
    </span>
  )
}

// ==================== HELPERS ====================

function formatCurrency(n: number) { return `$${Math.abs(n).toFixed(2)}` }
function formatDateTime(d: string) { return new Date(d).toLocaleString() }
function getInitials(email: string) { return email.slice(0, 2).toUpperCase() }

// ==================== MAIN COMPONENT ====================

export function AdminDashboard({ onLogout }: { onLogout?: () => void }) {
  const { user, logout: storeLogout } = useAuthStore()
  const logout = onLogout || storeLogout
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)

  // Fetch active orders count for notification badge
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await api.get<{ stats: { activeOrders: number } }>('/api/admin/dashboard')
        setActiveOrdersCount(data.stats.activeOrders)
      } catch { /* silent */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const mainTabs: { id: AdminTab; label: string; icon: React.ReactNode; section?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" />, section: 'manage' },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" />, section: 'manage' },
    { id: 'services', label: 'Services', icon: <Layers className="h-4 w-4" />, section: 'manage' },
    { id: 'providers', label: 'Providers', icon: <Server className="h-4 w-4" />, section: 'manage' },
    { id: 'finance', label: 'Finance', icon: <Wallet className="h-4 w-4" />, section: 'finance' },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, section: 'config' },
    { id: 'landing', label: 'Landing Page', icon: <Palette className="h-4 w-4" />, section: 'config' },
  ]

  const tabLabel = mainTabs.find(t => t.id === activeTab)?.label ?? 'Dashboard'

  return (
    <div className="dash-bg min-h-screen flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0514]/90 backdrop-blur-xl">
        <div className="flex h-14 items-center px-4 md:px-6 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-white">VerifyHub</h1>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-white/40">
            <span>Admin</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/70">{tabLabel}</span>
          </div>
          <div className="flex-1" />
          <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setActiveTab('orders')} title="View orders">
            <Bell className="h-4 w-4 text-white/50" />
            {activeOrdersCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.email ? getInitials(user.email) : 'AD'}
            </div>
            <span className="text-sm text-white/60">{user?.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-white/50 hover:text-white hover:bg-white/5">
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ===== SIDEBAR (Desktop) ===== */}
        <aside className="hidden md:flex flex-col border-r border-white/5 bg-[#0d0818]/80 backdrop-blur-xl w-56 p-3 gap-1 overflow-y-auto">
          {mainTabs.map((tab, idx) => {
            const nextTab = mainTabs[idx + 1]
            const showDivider = nextTab && tab.section && nextTab.section !== tab.section
            return (
              <div key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`dash-sidebar-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-violet-600/20 to-cyan-600/10 text-white border border-violet-500/30 shadow-lg shadow-violet-500/5'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-violet-400' : ''}>{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                  {activeTab === tab.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-sm shadow-violet-400/50" />
                  )}
                </button>
                {showDivider && <div className="my-2 border-t border-white/5" />}
              </div>
            )
          })}
        </aside>

        {/* ===== MOBILE BOTTOM TAB BAR ===== */}
        <div className="md:hidden flex fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#0a0514]/95 backdrop-blur-xl p-1 gap-1 overflow-x-auto">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] transition-all ${
                activeTab === tab.id ? 'text-violet-400 bg-violet-500/10' : 'text-white/40'
              }`}
            >
              {tab.icon}
              <span className="truncate max-w-[60px]">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} {...fadeUp} className="space-y-6">
              {activeTab === 'overview' && <OverviewTab onNav={setActiveTab} />}
              {activeTab === 'users' && <UsersTab />}
              {activeTab === 'orders' && <OrdersTab />}
              {activeTab === 'services' && <ServicesTab />}
              {activeTab === 'providers' && <ProvidersTab />}
              {activeTab === 'finance' && <FinanceTab />}
              {activeTab === 'settings' && <SettingsTab />}
              {activeTab === 'landing' && <LandingPageEditor />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

// ==================== OVERVIEW TAB ====================

function OverviewTab({ onNav }: { onNav: (tab: AdminTab) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get<DashboardStats>('/api/admin/dashboard')
      setStats(data)
    } catch {
      toast.error('Failed to load dashboard stats')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const handleRefresh = () => { setRefreshing(true); fetchStats() }

  const revenueByDay = stats?.revenueByDay ?? {}
  const days = Object.keys(revenueByDay).sort()
  const maxRevenue = Math.max(...days.map(d => revenueByDay[d] || 0), 1)
  const ordersByStatus = stats?.ordersByStatus ?? {}
  const totalOrders = Object.values(ordersByStatus).reduce((a, b) => a + b, 0) || 1

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="dash-card p-6"><Skeleton className="h-20 w-full bg-white/5" /></div>
        ))}
      </div>
    )
  }

  return (
    <motion.div {...staggerContainer} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Dashboard Overview</h2>
          <p className="text-white/40 text-sm mt-1">Your platform at a glance</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-white/50 hover:text-white hover:bg-white/5 border border-white/10">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Users', value: stats?.stats.totalUsers ?? 0, icon: <Users className="h-4 w-4" />, sub: 'Registered accounts', color: '#22c55e' },
          { label: 'Total Orders', value: stats?.stats.totalOrders ?? 0, icon: <ShoppingCart className="h-4 w-4" />, sub: 'All time orders', color: '#06b6d4' },
          { label: 'Revenue', value: formatCurrency(stats?.stats.totalRevenue ?? 0), icon: <DollarSign className="h-4 w-4" />, sub: 'Total revenue', color: '#a855f7' },
          { label: 'Pending Topups', value: stats?.stats.pendingTopups ?? 0, icon: <Clock className="h-4 w-4" />, sub: formatCurrency(stats?.stats.pendingTopupAmount ?? 0) + ' pending', color: '#f59e0b' },
        ].map((s, i) => (
          <motion.div key={i} {...fadeUp} className="dash-stat-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 font-medium uppercase tracking-wider">{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
            <span className="text-xs text-white/30">{s.sub}</span>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeUp}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-white/60">Quick Actions</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Add User', icon: <Plus className="h-3.5 w-3.5" />, tab: 'users' as AdminTab },
            { label: 'Sync Services', icon: <RefreshCw className="h-3.5 w-3.5" />, tab: 'services' as AdminTab },
            { label: 'View Funds', icon: <Wallet className="h-3.5 w-3.5" />, tab: 'finance' as AdminTab },
            { label: 'Manage Providers', icon: <Server className="h-3.5 w-3.5" />, tab: 'providers' as AdminTab },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => onNav(action.tab)}
              className="dash-sidebar-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 border border-white/5"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <motion.div {...fadeUp} className="dash-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-medium text-white/80">Revenue (Last 7 Days)</span>
            </div>
            <span className="text-xs text-white/30">{days.length} days</span>
          </div>
          {days.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {days.slice(-7).map((day) => {
                const val = revenueByDay[day] || 0
                const h = Math.max((val / maxRevenue) * 100, 4)
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-white/50 font-medium">${val.toFixed(0)}</span>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-cyan-500 transition-all duration-500" style={{ height: `${h}%` }} />
                    <span className="text-[10px] text-white/30">{new Date(day).toLocaleDateString('en', { weekday: 'short' })}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-white/20 text-sm">No revenue data yet</div>
          )}
        </motion.div>

        {/* Order Status Breakdown */}
        <motion.div {...fadeUp} className="dash-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">Order Status Breakdown</span>
            </div>
            <span className="text-xs text-white/30">{stats?.stats.totalOrders ?? 0} total</span>
          </div>
          {Object.keys(ordersByStatus).length > 0 ? (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                {Object.entries(ordersByStatus).map(([status, count]) => {
                  const pct = (count / totalOrders) * 100
                  return (
                    <div key={status} className="transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] ?? '#94a3b8' }} />
                  )
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {Object.entries(ordersByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] ?? '#94a3b8' }} />
                    <span className="text-white/50">{status}</span>
                    <span className="text-white/80 font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-white/20 text-sm">No orders yet</div>
          )}
        </motion.div>
      </div>

      {/* Top Services + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Services */}
        <motion.div {...fadeUp} className="dash-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-white/80">Top Services</span>
          </div>
          {stats?.topServices && stats.topServices.length > 0 ? (
            <div className="space-y-2">
              {stats.topServices.slice(0, 6).map((svc, i) => (
                <div key={svc.serviceId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-white/40 font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 truncate">{svc.name}</div>
                    <div className="text-[11px] text-white/30">{svc.category}</div>
                  </div>
                  <span className="text-xs text-white/50 font-medium">{svc.orderCount} orders</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-white/20 text-sm">No service data</div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div {...fadeUp} className="dash-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-white/80">Recent Activity</span>
          </div>
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recentOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    {order.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-cyan-400" /> :
                     order.status === 'CANCELLED' ? <XCircle className="h-4 w-4 text-red-400" /> :
                     <Clock className="h-4 w-4 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 truncate">
                      {order.user?.email ?? 'User'} — {order.providerService?.service?.name ?? 'Service'}
                    </div>
                    <div className="text-[11px] text-white/30">{new Date(order.createdAt).toLocaleString()}</div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-white/20 text-sm">No recent activity</div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

// ==================== USERS TAB ====================

function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'USER', balance: 0 })
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editData, setEditData] = useState({ name: '', role: '', balance: 0, isActive: true })
  const [adjustUser, setAdjustUser] = useState<User | null>(null)
  const [adjustData, setAdjustData] = useState({ amount: '', description: '' })
  const [adjusting, setAdjusting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '20', search }
      if (roleFilter) params.role = roleFilter
      const data = await api.get<PaginatedResponse<User>>('/api/admin/users', params)
      setUsers(data.data)
      setTotal(data.pagination.total)
    } catch {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleCreate = async () => {
    try {
      await api.post('/api/admin/users', newUser)
      toast.success('User created successfully')
      setShowCreate(false)
      setNewUser({ email: '', password: '', name: '', role: 'USER', balance: 0 })
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  const handleUpdate = async () => {
    if (!editUser) return
    try {
      await api.put(`/api/admin/users/${editUser.id}`, editData)
      toast.success('User updated')
      setEditUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      await api.delete(`/api/admin/users/${id}`)
      toast.success('User deactivated')
      fetchUsers()
    } catch {
      toast.error('Failed to deactivate user')
    }
  }

  const handleAdjustBalance = async () => {
    if (!adjustUser) return
    const amount = parseFloat(adjustData.amount)
    if (isNaN(amount) || amount === 0) { toast.error('Enter a valid non-zero amount'); return }
    setAdjusting(true)
    try {
      await api.post(`/api/admin/users/${adjustUser.id}/adjust-balance`, {
        amount,
        description: adjustData.description || `Admin ${amount > 0 ? 'credit' : 'deduction'} of $${Math.abs(amount).toFixed(2)}`,
      })
      toast.success(`Balance ${amount > 0 ? 'added' : 'deducted'}: ${formatCurrency(amount)}`)
      setAdjustUser(null)
      setAdjustData({ amount: '', description: '' })
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to adjust balance')
    } finally {
      setAdjusting(false)
    }
  }

  const openEdit = (user: User) => {
    setEditUser(user)
    setEditData({ name: user.name ?? '', role: user.role, balance: user.balance, isActive: user.isActive })
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <motion.div {...staggerContainer} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Users</h2>
          <p className="text-white/40 text-sm mt-1">{total} total users</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0 shadow-lg shadow-violet-500/20">
              <Plus className="h-4 w-4 mr-2" />Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141024] border-white/10">
            <DialogHeader><DialogTitle className="text-white">Create User</DialogTitle><DialogDescription className="text-white/50">Add a new user to the platform</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-white/70">Email</Label><Input className="dash-input mt-1" placeholder="user@example.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
              <div><Label className="text-white/70">Password</Label><Input className="dash-input mt-1" type="password" placeholder="Secure password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></div>
              <div><Label className="text-white/70">Name (optional)</Label><Input className="dash-input mt-1" placeholder="John Doe" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /></div>
              <div><Label className="text-white/70">Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger className="dash-input mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1430] border-white/10"><SelectItem value="USER">User</SelectItem><SelectItem value="ADMIN">Admin</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Users', value: total, color: '#22c55e' },
          { label: 'Active', value: users.filter(u => u.isActive).length, color: '#06b6d4' },
          { label: 'New This Week', value: users.filter(u => { const d = new Date(u.createdAt); const now = new Date(); return (now.getTime() - d.getTime()) < 7 * 86400000 }).length, color: '#a855f7' },
          { label: 'Total Balance', value: formatCurrency(users.reduce((s, u) => s + u.balance, 0)), color: '#f59e0b' },
        ].map((s, i) => (
          <motion.div key={i} {...fadeUp} className="dash-stat-card p-4">
            <div className="text-xs text-white/40 uppercase tracking-wider">{s.label}</div>
            <div className="text-xl font-bold text-white mt-1" style={{ color: s.color }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" />
          <Input className="dash-input pl-9" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="dash-input w-36"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent className="bg-[#1a1430] border-white/10">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <div className="dash-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="dash-table-header text-left px-4 py-3">User</th>
                  <th className="dash-table-header text-left px-4 py-3">Role</th>
                  <th className="dash-table-header text-left px-4 py-3">Balance</th>
                  <th className="dash-table-header text-left px-4 py-3">Status</th>
                  <th className="dash-table-header text-left px-4 py-3">Orders</th>
                  <th className="dash-table-header text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="dash-table-row border-b border-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.name ? u.name.slice(0, 2).toUpperCase() : getInitials(u.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm text-white/90 truncate">{u.email}</div>
                          <div className="text-xs text-white/30 truncate">{u.name ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${u.role === 'ADMIN' ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-white/50'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-400 font-medium">{formatCurrency(u.balance)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50">{u._count?.orders ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"><MoreVertical className="h-4 w-4 text-white/40" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1430] border-white/10" align="end">
                          <DropdownMenuItem onClick={() => openEdit(u)} className="text-white/70 focus:text-white focus:bg-white/5"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setAdjustUser(u); setAdjustData({ amount: '', description: '' }) }} className="text-white/70 focus:text-white focus:bg-white/5"><DollarSign className="h-4 w-4 mr-2" />Add Funds</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeactivate(u.id)} className="text-red-400 focus:text-red-300 focus:bg-white/5"><Ban className="h-4 w-4 mr-2" />Deactivate</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-white/20 text-sm">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-white/50 hover:text-white hover:bg-white/5">Previous</Button>
          <span className="flex items-center text-sm text-white/40">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-white/50 hover:text-white hover:bg-white/5">Next</Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="bg-[#141024] border-white/10">
          <DialogHeader><DialogTitle className="text-white">Edit User</DialogTitle><DialogDescription className="text-white/50">Update user settings</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-white/70">Name</Label><Input className="dash-input mt-1" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /></div>
            <div><Label className="text-white/70">Role</Label>
              <Select value={editData.role} onValueChange={(v) => setEditData({ ...editData, role: v })}>
                <SelectTrigger className="dash-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1430] border-white/10"><SelectItem value="USER">User</SelectItem><SelectItem value="ADMIN">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-white/70">Balance ($)</Label><Input type="number" className="dash-input mt-1" value={editData.balance} onChange={(e) => setEditData({ ...editData, balance: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={editData.isActive} onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })} /><Label className="text-white/70">Active</Label></div>
          </div>
          <DialogFooter><Button onClick={handleUpdate} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Balance Dialog */}
      <Dialog open={!!adjustUser} onOpenChange={() => setAdjustUser(null)}>
        <DialogContent className="bg-[#141024] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Adjust Balance</DialogTitle>
            <DialogDescription className="text-white/50">
              {adjustUser && <span>Current balance: <strong className="text-emerald-400">{formatCurrency(adjustUser.balance)}</strong> — {adjustUser.email}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <p className="text-sm font-medium text-white/70">Quick Adjust:</p>
              <div className="flex gap-2 flex-wrap">
                {[10, 25, 50, 100].map(v => (
                  <Button key={v} variant="ghost" size="sm" onClick={() => setAdjustData(prev => ({ ...prev, amount: String(v) }))} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-white/10">+${v}</Button>
                ))}
                {[10, 25, 50, 100].map(v => (
                  <Button key={`-${v}`} variant="ghost" size="sm" onClick={() => setAdjustData(prev => ({ ...prev, amount: String(-v) }))} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-white/10">-${v}</Button>
                ))}
              </div>
            </div>
            <div><Label className="text-white/70">Amount (negative to deduct)</Label><Input type="number" className="dash-input mt-1" placeholder="e.g. 50 or -25" value={adjustData.amount} onChange={(e) => setAdjustData({ ...adjustData, amount: e.target.value })} /></div>
            <div><Label className="text-white/70">Reason / Description</Label><Textarea className="dash-input mt-1" placeholder="Optional: reason for this adjustment" value={adjustData.description} onChange={(e) => setAdjustData({ ...adjustData, description: e.target.value })} rows={2} /></div>
            {adjustData.amount && (
              <div className={`p-3 rounded-lg text-sm font-medium ${parseFloat(adjustData.amount) > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                New balance: {formatCurrency((adjustUser?.balance ?? 0) + parseFloat(adjustData.amount || '0'))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustUser(null)} className="text-white/50 hover:text-white hover:bg-white/5">Cancel</Button>
            <Button onClick={handleAdjustBalance} disabled={adjusting || !adjustData.amount} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
              {adjusting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : 'Confirm Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ==================== ORDERS TAB ====================

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' }
      if (status) params.status = status
      const data = await api.get<PaginatedResponse<Order>>('/api/admin/orders', params)
      setOrders(data.data)
      setTotal(data.pagination.total)
    } catch {
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const statusCounts: Record<string, number> = {}
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1 })
  const totalVisible = orders.length || 1

  const totalPages = Math.ceil(total / 20)

  return (
    <motion.div {...staggerContainer} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Orders</h2>
          <p className="text-white/40 text-sm mt-1">{total} total orders</p>
        </div>
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="dash-input w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent className="bg-[#1a1430] border-white/10">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Distribution */}
      {Object.keys(statusCounts).length > 0 && (
        <div className="dash-card p-4">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-white/5 mb-3">
            {Object.entries(statusCounts).map(([s, c]) => (
              <div key={s} className="transition-all duration-500" style={{ width: `${(c / totalVisible) * 100}%`, backgroundColor: STATUS_COLORS[s] ?? '#94a3b8' }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(statusCounts).map(([s, c]) => (
              <span key={s} className="text-xs text-white/40"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: STATUS_COLORS[s] }} />{s}: {c}</span>
            ))}
          </div>
        </div>
      )}

      <div className="dash-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="dash-table-header text-left px-4 py-3">ID</th>
                  <th className="dash-table-header text-left px-4 py-3">User</th>
                  <th className="dash-table-header text-left px-4 py-3">Service</th>
                  <th className="dash-table-header text-left px-4 py-3">Phone</th>
                  <th className="dash-table-header text-left px-4 py-3">Revenue</th>
                  <th className="dash-table-header text-left px-4 py-3">Status</th>
                  <th className="dash-table-header text-left px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="dash-table-row border-b border-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm text-white/80">{o.user?.email ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{o.providerService?.service?.name ?? '-'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/70">{o.phoneNumber ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-emerald-400 font-medium">{o.transaction ? formatCurrency(o.transaction.amount) : '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-xs text-white/30 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-white/20 text-sm">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-white/50 hover:text-white hover:bg-white/5">Previous</Button>
          <span className="flex items-center text-sm text-white/40">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-white/50 hover:text-white hover:bg-white/5">Next</Button>
        </div>
      )}
    </motion.div>
  )
}

// ==================== SERVICES TAB ====================

function ServicesTab() {
  const [services, setServices] = useState<Service[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '50' }
      if (search) params.search = search
      if (category) params.category = category
      const data = await api.get<PaginatedResponse<Service>>('/api/admin/services', params)
      setServices(data.data)
      setTotal(data.pagination.total)
    } catch {
      toast.error('Failed to fetch services')
    } finally {
      setLoading(false)
    }
  }, [page, search, category])

  useEffect(() => { fetchServices() }, [fetchServices])

  const categories = [...new Set(services.map(s => s.category))]

  return (
    <motion.div {...staggerContainer} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Services</h2>
          <p className="text-white/40 text-sm mt-1">{total} total services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchServices} className="text-white/50 hover:text-white hover:bg-white/5 border border-white/10">
            <RefreshCw className="h-4 w-4 mr-2" />Sync
          </Button>
        </div>
      </div>

      {/* Category Filter Chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCategory(''); setPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!category ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-white/40 border border-white/10 hover:bg-white/5'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${category === cat ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-white/40 border border-white/10 hover:bg-white/5'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" />
        <Input className="dash-input pl-9" placeholder="Search services..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {/* Service Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl bg-white/5" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <motion.div key={s.id} {...fadeUp} className={`dash-card p-4 ${!s.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center border border-violet-500/20">
                    <Layers className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/90">{s.name}</div>
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/40 mt-0.5">{s.category}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${s.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/30">
                <span>{s._count?.providerServices ?? 0} providers</span>
                <span>{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
          {services.length === 0 && (
            <div className="col-span-full text-center py-16 text-white/20 text-sm">No services found. Sync to load services from providers.</div>
          )}
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-white/50 hover:text-white hover:bg-white/5">Previous</Button>
          <span className="flex items-center text-sm text-white/40">Page {page}</span>
          <Button variant="ghost" size="sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} className="text-white/50 hover:text-white hover:bg-white/5">Next</Button>
        </div>
      )}
    </motion.div>
  )
}

// ==================== PROVIDERS TAB ====================

const PROVIDER_PRESETS = [
  { name: '5sim', apiUrl: 'https://5sim.net/v1', description: 'Large SMS provider, 150+ countries' },
  { name: 'SMS-Man', apiUrl: 'https://api.sms-man.com', description: 'Popular rent API, 200+ countries. Token-based REST.' },
  { name: 'HeroSMS', apiUrl: 'https://hero-sms.com/stubs/handler_api.php', description: 'Competitive pricing, 200+ countries. SMS-Activate compatible API.' },
  { name: 'SMS-Activate', apiUrl: 'https://api.sms-activate.org/stubs/handler_api.php', description: 'Popular verification service' },
]

function ProvidersTab() {
  const [providers, setProviders] = useState<Array<Provider & { _count?: { providerServices: number }; hasApiKey?: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [newProvider, setNewProvider] = useState({ name: '', apiKey: '', apiUrl: '', priority: 10 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', apiKey: '', apiUrl: '', priority: 0 })
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; balance?: number; currency?: string; error?: string; responseTime?: number }>>({})
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<PaginatedResponse<any>>('/api/admin/providers')
      setProviders(data.data)
    } catch {
      toast.error('Failed to fetch providers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  const handleCreate = async () => {
    if (!newProvider.name || !newProvider.apiUrl) { toast.error('Name and API URL are required'); return }
    try {
      await api.post('/api/admin/providers', newProvider)
      toast.success(`Provider "${newProvider.name}" created successfully!`)
      setShowCreate(false)
      setNewProvider({ name: '', apiKey: '', apiUrl: '', priority: 10 })
      fetchProviders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create provider')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/admin/providers/${id}`)
      toast.success('Provider deleted')
      setShowDeleteConfirm(null)
      fetchProviders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete provider')
    }
  }

  const handleToggleActive = async (p: typeof providers[0]) => {
    try {
      await api.put(`/api/admin/providers/${p.id}`, { isActive: !p.isActive })
      toast.success(p.isActive ? 'Provider disabled' : 'Provider enabled')
      fetchProviders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update provider')
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    setTestResults(prev => ({ ...prev, [id]: { success: false, error: 'Testing...' } }))
    try {
      const data = await api.post<{ data: { success: boolean; balance?: { balance: number; currency: string }; error?: string; responseTime?: number } }>('/api/admin/providers/test', { providerId: id })
      const result = data.data
      setTestResults(prev => ({ ...prev, [id]: { success: result.success, balance: result.balance?.balance, currency: result.balance?.currency, error: result.error, responseTime: result.responseTime } }))
      if (result.success) {
        toast.success(`Connection successful! Balance: ${result.balance?.balance} ${result.balance?.currency} (${result.responseTime}ms)`)
      } else {
        toast.error(`Connection failed: ${result.error}`)
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, error: err instanceof Error ? err.message : 'Test failed' } }))
      toast.error('Failed to test connection')
    } finally {
      setTestingId(null)
    }
  }

  const handleSync = async (id: string) => {
    if (!confirm('This will import all available services and prices from the provider. Continue?')) return
    setSyncingId(id)
    setSyncProgress('Connecting to provider...')
    try {
      const data = await api.post<{ data: { stats: { servicesFetched: number; servicesCreated: number; countriesCreated: number; providerServicesCreated: number; providerServicesUpdated: number }; message: string } }>('/api/admin/providers/sync', { providerId: id, markupPercent: 30 })
      const stats = data.data.stats
      toast.success(data.data.message)
      setSyncProgress(`Done! ${stats.servicesCreated} new services, ${stats.countriesCreated} new countries, ${stats.providerServicesCreated} new mappings.`)
      fetchProviders()
      setTimeout(() => setSyncProgress(''), 10000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync services')
      setSyncProgress('')
    } finally {
      setSyncingId(null)
    }
  }

  const startEdit = (p: typeof providers[0]) => {
    setEditingId(p.id)
    setExpandedId(p.id)
    setEditForm({ name: p.name, apiKey: '', apiUrl: p.apiUrl, priority: p.priority })
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    try {
      const updateData: Record<string, any> = { name: editForm.name, apiUrl: editForm.apiUrl, priority: editForm.priority }
      if (editForm.apiKey) updateData.apiKey = editForm.apiKey
      await api.put(`/api/admin/providers/${editingId}`, updateData)
      toast.success('Provider updated successfully')
      setEditingId(null)
      fetchProviders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update provider')
    }
  }

  const getProviderColor = (name: string) => {
    if (name.toLowerCase().includes('5sim')) return 'from-orange-500 to-red-500'
    if (name.toLowerCase().includes('sms-man') || name.toLowerCase().includes('smsman')) return 'from-blue-500 to-indigo-500'
    if (name.toLowerCase().includes('hero')) return 'from-emerald-500 to-teal-500'
    return 'from-violet-500 to-cyan-500'
  }

  return (
    <motion.div {...staggerContainer} className="space-y-6">
      {/* Smart Routing Banner */}
      <motion.div {...fadeUp} className="dash-card p-4 border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-cyan-500/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white/90">Smart Order Routing Active</h3>
            <p className="text-xs text-white/40 mt-0.5">
              When a customer buys a number, the system automatically compares up to <strong className="text-white/60">4 active providers</strong> that offer the same service+country.
              The order goes to the <strong className="text-white/60">lowest-priced provider</strong>. If that provider fails, it falls back to the next cheapest automatically.
            </p>
            <p className="text-xs text-violet-400 mt-1 font-medium">
              {providers.filter(p => p.isActive).length} active provider{providers.filter(p => p.isActive).length !== 1 ? 's' : ''} · {providers.reduce((sum, p) => sum + (p._count?.providerServices || 0), 0)} service mappings loaded
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gradient">SMS Providers</h2>
          <p className="text-white/40 text-sm mt-1">Configure API keys and sync services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowGuide(!showGuide)} className="text-white/50 hover:text-white hover:bg-white/5 border border-white/10">
            <Settings className="h-4 w-4 mr-2" />Setup Guide
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0 shadow-lg shadow-violet-500/20">
                <Plus className="h-4 w-4 mr-2" />Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#141024] border-white/10 max-w-lg">
              <DialogHeader><DialogTitle className="text-white">Add SMS Provider</DialogTitle><DialogDescription className="text-white/50">Connect a new SMS verification provider</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-white/70">Provider Type</Label>
                  <div className="mt-2 space-y-2">
                    {PROVIDER_PRESETS.map((preset) => (
                      <button key={preset.name} onClick={() => setNewProvider({ ...newProvider, name: preset.name, apiUrl: preset.apiUrl })}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${newProvider.name === preset.name ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">{preset.name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="text-sm font-medium text-white/80">{preset.name}</div>
                          <div className="text-xs text-white/40">{preset.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-white/10 pt-3 space-y-3">
                  <div><Label className="text-white/70">Provider Name</Label><Input className="dash-input mt-1" value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} placeholder="e.g., 5sim" /></div>
                  <div><Label className="text-white/70">API Key</Label><Input className="dash-input mt-1" type="password" placeholder="Enter your API key" value={newProvider.apiKey} onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })} /></div>
                  <div><Label className="text-white/70">API URL</Label><Input className="dash-input mt-1" value={newProvider.apiUrl} onChange={(e) => setNewProvider({ ...newProvider, apiUrl: e.target.value })} placeholder="https://5sim.net/v1" /></div>
                  <div><Label className="text-white/70">Priority</Label><Input type="number" className="dash-input mt-1" value={newProvider.priority} onChange={(e) => setNewProvider({ ...newProvider, priority: Number(e.target.value) })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowGuide(true)} className="text-white/50 hover:text-white hover:bg-white/5">View 5sim Guide</Button>
                <Button onClick={handleCreate} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">Create Provider</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Setup Guide */}
      {showGuide && (
        <motion.div {...fadeUp} className="dash-card p-6 border-violet-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white/90">API Key Setup Guide</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowGuide(false)} className="text-white/50 hover:text-white hover:bg-white/5">Close</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { name: '5sim', url: 'https://5sim.net', color: 'from-orange-500 to-red-500', initials: '5S' },
              { name: 'SMS-Man', url: 'https://sms-man.com', color: 'from-blue-500 to-indigo-500', initials: 'SM' },
              { name: 'HeroSMS', url: 'https://hero-sms.com', color: 'from-emerald-500 to-teal-500', initials: 'HS' },
            ].map((provider) => (
              <div key={provider.name} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${provider.color} flex items-center justify-center text-white text-xs font-bold`}>{provider.initials}</div>
                  <div>
                    <h4 className="font-semibold text-white/80">{provider.name}</h4>
                    <p className="text-xs text-white/30">{provider.url}</p>
                  </div>
                </div>
                <ol className="space-y-2 text-sm text-white/60">
                  <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">1</span><span>Create an account on <strong className="text-white/80">{provider.name}</strong></span></li>
                  <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">2</span><span>Add funds to your balance</span></li>
                  <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">3</span><span>Go to API Settings and generate API key</span></li>
                  <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">4</span><span>Copy key and paste in the form above</span></li>
                  <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">5</span><span>Click &quot;Test Connection&quot; then &quot;Sync Services&quot;</span></li>
                </ol>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sync Progress */}
      {syncProgress && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          {syncingId && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          <RefreshCw className={`h-4 w-4 ${syncingId ? 'animate-spin' : ''}`} />
          {syncProgress}
        </div>
      )}

      {/* Providers Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl bg-white/5" />)}</div>
      ) : providers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((p) => {
            const isExpanded = expandedId === p.id
            const testResult = testResults[p.id]

            return (
            <motion.div key={p.id} {...fadeUp} className={`dash-card overflow-hidden transition-opacity ${!p.isActive ? 'opacity-50' : ''}`}>
              {/* Provider Header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getProviderColor(p.name)} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white/90">{p.name}</div>
                      <div className="text-xs text-white/40">{p._count?.providerServices || 0} services · Priority {p.priority}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${p.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"><MoreVertical className="h-4 w-4 text-white/40" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1430] border-white/10" align="end">
                        <DropdownMenuItem onClick={() => handleToggleActive(p)} className="text-white/70 focus:text-white focus:bg-white/5">
                          {p.isActive ? <><Ban className="h-4 w-4 mr-2" />Disable</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Enable</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startEdit(p)} className="text-white/70 focus:text-white focus:bg-white/5"><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTest(p.id)} disabled={testingId === p.id} className="text-white/70 focus:text-white focus:bg-white/5">
                          <Activity className="h-4 w-4 mr-2" />Test Connection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSync(p.id)} disabled={syncingId === p.id || !p.isActive} className="text-white/70 focus:text-white focus:bg-white/5">
                          <RefreshCw className={`h-4 w-4 mr-2 ${syncingId === p.id ? 'animate-spin' : ''}`} />Sync Services
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowDeleteConfirm(p.id)} className="text-red-400 focus:text-red-300 focus:bg-white/5"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* API Key Status */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${p.hasApiKey ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {p.hasApiKey ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {p.hasApiKey ? 'API Key Configured' : 'No API Key'}
                  </div>
                  {p.hasApiKey && p.apiKey && (
                    <span className="text-[11px] text-white/25 font-mono truncate">{p.apiKey}</span>
                  )}
                </div>

                {/* API URL */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <Globe className="h-3 w-3 text-white/30 shrink-0" />
                  <span className="text-white/40 truncate">{p.apiUrl}</span>
                </div>

                {/* Test Result Banner */}
                {testResult && (
                  <div className={`p-3 rounded-lg mb-3 text-xs ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {testResult.success ? (
                      <span className="flex items-center gap-1.5">✓ Connected · Balance: {testResult.balance} {testResult.currency} · {testResult.responseTime}ms</span>
                    ) : (
                      <span className="flex items-center gap-1.5">✗ {testResult.error}</span>
                    )}
                  </div>
                )}

                {/* Quick Actions Row */}
                <div className="flex gap-2">
                  <button onClick={() => handleTest(p.id)} disabled={testingId === p.id} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 border border-white/5">
                    {testingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                    Test
                  </button>
                  <button onClick={() => handleSync(p.id)} disabled={syncingId === p.id || !p.isActive} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-50 border border-violet-500/20">
                    {syncingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Sync
                  </button>
                  <button onClick={() => { setExpandedId(isExpanded ? null : p.id); if (!isExpanded) setEditingId(null) }} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors border border-white/5">
                    <Settings className="h-3 w-3" />
                    {isExpanded ? 'Hide' : 'Config'}
                  </button>
                </div>
              </div>

              {/* Expandable Config Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="border-t border-white/5 bg-white/[0.02] p-5 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Settings className="h-3.5 w-3.5 text-violet-400" />
                        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Provider Configuration</span>
                      </div>

                      {editingId === p.id ? (
                        <>
                          {/* Edit Mode */}
                          <div><Label className="text-white/70 text-xs">Provider Name</Label><Input className="dash-input mt-1 h-8 text-sm" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                          <div>
                            <Label className="text-white/70 text-xs">
                              API Key
                              {p.hasApiKey && <span className="ml-2 text-emerald-400 font-normal">(Key is set — leave blank to keep current)</span>}
                            </Label>
                            <Input className="dash-input mt-1 h-8 text-sm" type="password" placeholder={p.hasApiKey ? '••••••••••••' : 'Enter your API key'} value={editForm.apiKey} onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })} />
                          </div>
                          <div><Label className="text-white/70 text-xs">API URL</Label><Input className="dash-input mt-1 h-8 text-sm" value={editForm.apiUrl} onChange={(e) => setEditForm({ ...editForm, apiUrl: e.target.value })} /></div>
                          <div><Label className="text-white/70 text-xs">Priority</Label><Input type="number" className="dash-input mt-1 h-8 text-sm" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })} /></div>
                          <div className="flex gap-2 pt-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingId(null) }} className="flex-1 text-white/50 hover:text-white hover:bg-white/5 border border-white/10">Cancel</Button>
                            <Button size="sm" onClick={handleSaveEdit} className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
                              <Save className="h-3.5 w-3.5 mr-1" />Save Changes
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Read-Only Config View */}
                          <div className="grid gap-3">
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                              <span className="text-xs text-white/40">API Key</span>
                              <span className={`text-xs font-medium ${p.hasApiKey ? 'text-emerald-400' : 'text-red-400'}`}>
                                {p.hasApiKey ? (p.apiKey || '••••••••') : 'Not configured'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                              <span className="text-xs text-white/40">API URL</span>
                              <span className="text-xs text-white/60 font-mono truncate max-w-[200px]">{p.apiUrl}</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                              <span className="text-xs text-white/40">Priority</span>
                              <span className="text-xs text-white/60">{p.priority}</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                              <span className="text-xs text-white/40">Status</span>
                              <span className={`text-xs font-medium ${p.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {p.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                              <span className="text-xs text-white/40">Service Mappings</span>
                              <span className="text-xs text-white/60">{p._count?.providerServices || 0}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={() => startEdit(p)} className="flex-1 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20">
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit Settings
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setExpandedId(null) }} className="flex-1 text-white/40 hover:text-white hover:bg-white/5">
                              Collapse
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="dash-card p-16 text-center text-white/20">No providers configured yet. Add your first provider above.</div>
      )}

      {/* Delete Confirm */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="bg-[#141024] border-white/10">
          <DialogHeader><DialogTitle className="text-white">Delete Provider</DialogTitle><DialogDescription className="text-white/50">This action cannot be undone. All provider service mappings will be removed.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)} className="text-white/50 hover:text-white hover:bg-white/5">Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ==================== FINANCE TAB ====================

function FinanceTab() {
  const [activeSubTab, setActiveSubTab] = useState<'fund-requests' | 'transactions' | 'commissions'>('fund-requests')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [txPage, setTxPage] = useState(1)
  const [txLoading, setTxLoading] = useState(true)
  const [commissions, setCommissions] = useState<any[]>([])
  const [comLoading, setComLoading] = useState(false)
  const [editingCommission, setEditingCommission] = useState<string | null>(null)
  const [commissionValue, setCommissionValue] = useState('')

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true)
    try {
      const data = await api.get<PaginatedResponse<Transaction>>('/api/admin/transactions', { page: String(txPage), limit: '20' })
      setTransactions(data.data)
      setTxTotal(data.pagination.total)
    } catch {
      toast.error('Failed to fetch transactions')
    } finally {
      setTxLoading(false)
    }
  }, [txPage])

  useEffect(() => {
    if (activeSubTab === 'transactions') fetchTransactions()
  }, [activeSubTab, fetchTransactions])

  const fetchCommissions = useCallback(async () => {
    setComLoading(true)
    try {
      const data = await api.get<any>('/api/admin/provider-services')
      setCommissions(Array.isArray(data) ? data : data.data ?? [])
    } catch {
      toast.error('Failed to fetch commissions')
    } finally {
      setComLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeSubTab === 'commissions') fetchCommissions()
  }, [activeSubTab, fetchCommissions])

  const handleUpdateCommission = async (id: string) => {
    try {
      await api.put(`/api/admin/provider-services`, { id, markupPercent: Number(commissionValue) })
      toast.success('Commission updated')
      setEditingCommission(null)
      fetchCommissions()
    } catch {
      toast.error('Failed to update commission')
    }
  }

  return (
    <motion.div {...staggerContainer} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gradient">Finance</h2>
        <p className="text-white/40 text-sm mt-1">Manage fund requests, transactions, and commissions</p>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10 w-fit">
        {[
          { id: 'fund-requests' as const, label: 'Fund Requests', icon: <Wallet className="h-4 w-4" /> },
          { id: 'transactions' as const, label: 'Transactions', icon: <CreditCard className="h-4 w-4" /> },
          { id: 'commissions' as const, label: 'Commissions', icon: <Percent className="h-4 w-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeSubTab === tab.id
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeSubTab} {...fadeUp}>
          {activeSubTab === 'fund-requests' && <FundRequestsTab />}
          {activeSubTab === 'transactions' && (
            <div className="dash-card overflow-hidden">
              {txLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="dash-table-header text-left px-4 py-3">User</th>
                        <th className="dash-table-header text-left px-4 py-3">Type</th>
                        <th className="dash-table-header text-left px-4 py-3">Amount</th>
                        <th className="dash-table-header text-left px-4 py-3">Balance</th>
                        <th className="dash-table-header text-left px-4 py-3">Description</th>
                        <th className="dash-table-header text-left px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="dash-table-row border-b border-white/5">
                          <td className="px-4 py-3 text-sm text-white/80">{tx.user?.email ?? tx.userId}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {tx.amount > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {tx.type}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/50">{formatCurrency(tx.balanceAfter)}</td>
                          <td className="px-4 py-3 text-xs text-white/40 max-w-[200px] truncate">{tx.description ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-white/30 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-12 text-white/20 text-sm">No transactions found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {txTotal > 20 && (
                <div className="flex justify-center gap-2 p-4 border-t border-white/5">
                  <Button variant="ghost" size="sm" disabled={txPage <= 1} onClick={() => setTxPage(p => p - 1)} className="text-white/50 hover:text-white hover:bg-white/5">Previous</Button>
                  <span className="flex items-center text-sm text-white/40">Page {txPage}</span>
                  <Button variant="ghost" size="sm" disabled={txPage >= Math.ceil(txTotal / 20)} onClick={() => setTxPage(p => p + 1)} className="text-white/50 hover:text-white hover:bg-white/5">Next</Button>
                </div>
              )}
            </div>
          )}
          {activeSubTab === 'commissions' && (
            <div className="dash-card overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/80">Commission Management</h3>
                  <p className="text-xs text-white/40 mt-0.5">Adjust markup percentages for provider services</p>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchCommissions} disabled={comLoading} className="text-white/50 hover:text-white hover:bg-white/5 border border-white/10">
                  <RefreshCw className={`h-4 w-4 mr-2 ${comLoading ? 'animate-spin' : ''}`} />Refresh
                </Button>
              </div>
              {comLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}</div>
              ) : commissions.length > 0 ? (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="dash-table-header text-left px-4 py-3">Service</th>
                        <th className="dash-table-header text-left px-4 py-3">Provider</th>
                        <th className="dash-table-header text-left px-4 py-3">Cost</th>
                        <th className="dash-table-header text-left px-4 py-3">Markup</th>
                        <th className="dash-table-header text-left px-4 py-3">Sells At</th>
                        <th className="dash-table-header text-right px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.slice(0, 50).map((cs: any) => {
                        const sellsAt = cs.externalPrice * (1 + cs.markupPercent / 100)
                        return (
                          <tr key={cs.id} className="dash-table-row border-b border-white/5">
                            <td className="px-4 py-2.5 text-sm text-white/80">{cs.service?.name ?? '-'}</td>
                            <td className="px-4 py-2.5 text-xs text-white/50">{cs.provider?.name ?? '-'}</td>
                            <td className="px-4 py-2.5 text-sm text-white/60">{formatCurrency(cs.externalPrice)}</td>
                            <td className="px-4 py-2.5">
                              {editingCommission === cs.id ? (
                                <Input className="dash-input h-7 w-20 text-xs" type="number" value={commissionValue} onChange={(e) => setCommissionValue(e.target.value)} />
                              ) : (
                                <span className="text-sm text-violet-400 font-medium">{cs.markupPercent}%</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-emerald-400 font-medium">{formatCurrency(sellsAt)}</td>
                            <td className="px-4 py-2.5 text-right">
                              {editingCommission === cs.id ? (
                                <div className="flex gap-1 justify-end">
                                  <button onClick={() => setEditingCommission(null)} className="px-2 py-1 text-xs text-white/40 hover:text-white">Cancel</button>
                                  <button onClick={() => handleUpdateCommission(cs.id)} className="px-2 py-1 text-xs bg-violet-500/20 text-violet-300 rounded hover:bg-violet-500/30">Save</button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingCommission(cs.id); setCommissionValue(String(cs.markupPercent)) }} className="text-xs text-white/40 hover:text-violet-400 transition-colors">
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-white/20 text-sm">No provider services configured. Sync from Providers tab first.</div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

// ==================== LANDING PAGE EDITOR ====================

function LandingPageEditor() {
  const [content, setContent] = useState<LandingContent>(DEFAULT_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const [hasChanges, setHasChanges] = useState(false)
  const [previewDialog, setPreviewDialog] = useState(false)

  const fetchContent = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: LandingContent }>('/api/admin/landing')
      setContent(res.data)
      setHasChanges(false)
    } catch {
      toast.error('Failed to load landing page content')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContent() }, [fetchContent])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/api/admin/landing', { content })
      setHasChanges(false)
      toast.success('Landing page updated successfully!')
    } catch {
      toast.error('Failed to save landing page')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Reset all changes? This will revert to the last saved version.')) {
      fetchContent()
    }
  }

  const updateHero = (key: string, value: string | boolean) => { setContent(prev => ({ ...prev, hero: { ...prev.hero, [key]: value } })); setHasChanges(true) }
  const updateStat = (index: number, key: string, value: string) => { setContent(prev => { const stats = [...prev.stats]; stats[index] = { ...stats[index], [key]: value }; return { ...prev, stats } }); setHasChanges(true) }
  const addStat = () => { setContent(prev => ({ ...prev, stats: [...prev.stats, { value: '0', label: 'New Stat' }] })); setHasChanges(true) }
  const removeStat = (index: number) => { setContent(prev => ({ ...prev, stats: prev.stats.filter((_, i) => i !== index) })); setHasChanges(true) }
  const updateHowItWorks = (key: string, value: string) => { setContent(prev => ({ ...prev, howItWorks: { ...prev.howItWorks, [key]: value } })); setHasChanges(true) }
  const updateStep = (index: number, key: string, value: string) => { setContent(prev => { const steps = [...prev.howItWorks.steps]; steps[index] = { ...steps[index], [key]: value }; return { ...prev, howItWorks: { ...prev.howItWorks, steps } } }); setHasChanges(true) }
  const addStep = () => { setContent(prev => ({ ...prev, howItWorks: { ...prev.howItWorks, steps: [...prev.howItWorks.steps, { title: 'New Step', description: 'Description', icon: 'CheckCircle2' }] } })); setHasChanges(true) }
  const removeStep = (index: number) => { setContent(prev => ({ ...prev, howItWorks: { ...prev.howItWorks, steps: prev.howItWorks.steps.filter((_, i) => i !== index) } })); setHasChanges(true) }
  const updateFeatures = (key: string, value: string) => { setContent(prev => ({ ...prev, features: { ...prev.features, [key]: value } })); setHasChanges(true) }
  const updateFeatureItem = (index: number, key: string, value: string) => { setContent(prev => { const items = [...prev.features.items]; items[index] = { ...items[index], [key]: value }; return { ...prev, features: { ...prev.features, items } } }); setHasChanges(true) }
  const addFeature = () => { setContent(prev => ({ ...prev, features: { ...prev.features, items: [...prev.features.items, { title: 'New Feature', description: 'Description', icon: 'Star', color: 'violet' }] } })); setHasChanges(true) }
  const removeFeature = (index: number) => { setContent(prev => ({ ...prev, features: { ...prev.features, items: prev.features.items.filter((_, i) => i !== index) } })); setHasChanges(true) }
  const updateTestimonials = (key: string, value: string) => { setContent(prev => ({ ...prev, testimonials: { ...prev.testimonials, [key]: value } })); setHasChanges(true) }
  const updateTestimonialItem = (index: number, key: string, value: string | number) => { setContent(prev => { const items = [...prev.testimonials.items]; items[index] = { ...items[index], [key]: value }; return { ...prev, testimonials: { ...prev.testimonials, items } } }); setHasChanges(true) }
  const addTestimonial = () => { setContent(prev => ({ ...prev, testimonials: { ...prev.testimonials, items: [...prev.testimonials.items, { name: 'Name', role: 'Role', text: 'Testimonial text...', initials: 'NN', rating: 5 }] } })); setHasChanges(true) }
  const removeTestimonial = (index: number) => { setContent(prev => ({ ...prev, testimonials: { ...prev.testimonials, items: prev.testimonials.items.filter((_, i) => i !== index) } })); setHasChanges(true) }
  const updateCTA = (key: string, value: string) => { setContent(prev => ({ ...prev, cta: { ...prev.cta, [key]: value } })); setHasChanges(true) }
  const updateFooter = (key: string, value: string) => { setContent(prev => ({ ...prev, footer: { ...prev.footer, [key]: value } })); setHasChanges(true) }
  const updateFooterLink = (index: number, key: string, value: string) => { setContent(prev => { const links = [...prev.footer.links]; links[index] = { ...links[index], [key]: value }; return { ...prev, footer: { ...prev.footer, links } } }); setHasChanges(true) }
  const addFooterLink = () => { setContent(prev => ({ ...prev, footer: { ...prev.footer, links: [...prev.footer.links, { label: 'Link', url: '#' }] } })); setHasChanges(true) }
  const removeFooterLink = (index: number) => { setContent(prev => ({ ...prev, footer: { ...prev.footer, links: prev.footer.links.filter((_, i) => i !== index) } })); setHasChanges(true) }

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full bg-white/5" />)}</div>
  }

  const sections = [
    { id: 'hero', label: 'Hero Section', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'stats', label: 'Stats Bar', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'howItWorks', label: 'How It Works', icon: <Layout className="h-4 w-4" /> },
    { id: 'features', label: 'Features', icon: <Star className="h-4 w-4" /> },
    { id: 'testimonials', label: 'Testimonials', icon: <MessageSquareText className="h-4 w-4" /> },
    { id: 'cta', label: 'CTA Section', icon: <FileText className="h-4 w-4" /> },
    { id: 'footer', label: 'Footer', icon: <Globe className="h-4 w-4" /> },
  ]

  return (
    <motion.div {...staggerContainer} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Landing Page Editor</h2>
          <p className="text-white/40 text-sm mt-1">Customize your public landing page content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={!hasChanges} className="text-white/50 hover:text-white hover:bg-white/5 border border-white/10">
            <RotateCcw className="h-4 w-4 mr-2" />Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 shadow-lg shadow-violet-500/20">
            <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes */}
      {hasChanges && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          You have unsaved changes. Don&apos;t forget to save!
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Section Navigation */}
        <div className="lg:col-span-1">
          <div className="dash-card p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                  activeSection === section.id
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent'
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-3">
          <ScrollArea className="max-h-[calc(100vh-220px)]">
            <div className="dash-card p-6 space-y-6">
              {/* HERO */}
              {activeSection === 'hero' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-lg font-semibold text-white/90">
                    <Sparkles className="h-5 w-5 text-violet-400" />Hero Section
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Main Title</Label>
                    <Input className="dash-input" value={content.hero.title} onChange={(e) => updateHero('title', e.target.value)} placeholder="Virtual Phone Numbers" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Subtitle</Label>
                    <Input className="dash-input" value={content.hero.subtitle} onChange={(e) => updateHero('subtitle', e.target.value)} placeholder="SMS Verification" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Description</Label>
                    <Textarea className="dash-input" value={content.hero.description} onChange={(e) => updateHero('description', e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">CTA Button Text</Label>
                    <Input className="dash-input" value={content.hero.ctaText} onChange={(e) => updateHero('ctaText', e.target.value)} placeholder="Get Started Free" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={content.hero.showStats} onCheckedChange={(v) => updateHero('showStats', v)} />
                    <Label className="text-white/70">Show Stats Bar Below Hero</Label>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-violet-950/50 to-cyan-950/50 border border-violet-500/20">
                    <div className="text-xs text-violet-400 mb-2 font-medium">PREVIEW</div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-1">{content.hero.title || 'Title'}</div>
                    <div className="text-violet-300 text-sm mb-2">{content.hero.subtitle || 'Subtitle'}</div>
                    <div className="text-gray-400 text-xs mb-3">{content.hero.description || 'Description...'}</div>
                    <div className="inline-flex px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl text-sm font-medium">{content.hero.ctaText || 'Button'}</div>
                  </div>
                </div>
              )}

              {/* STATS */}
              {activeSection === 'stats' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-lg font-semibold text-white/90">
                      <TrendingUp className="h-5 w-5 text-cyan-400" />Stats Bar
                    </div>
                    <Button size="sm" variant="ghost" onClick={addStat} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-white/10">
                      <PlusCircle className="h-4 w-4 mr-1" />Add Stat
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {content.stats.map((stat, i) => (
                      <div key={i} className="flex gap-2 items-end p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex-1 space-y-1">
                          <Label className="text-white/60 text-xs">Value</Label>
                          <Input className="dash-input h-8 text-sm" value={stat.value} onChange={(e) => updateStat(i, 'value', e.target.value)} placeholder="150+" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-white/60 text-xs">Label</Label>
                          <Input className="dash-input h-8 text-sm" value={stat.label} onChange={(e) => updateStat(i, 'label', e.target.value)} placeholder="Countries" />
                        </div>
                        <button onClick={() => removeStat(i)} className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 shrink-0"><Trash className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HOW IT WORKS */}
              {activeSection === 'howItWorks' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-lg font-semibold text-white/90">
                    <Layout className="h-5 w-5 text-emerald-400" />How It Works
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Section Title</Label>
                    <Input className="dash-input" value={content.howItWorks.title} onChange={(e) => updateHowItWorks('title', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Section Subtitle</Label>
                    <Input className="dash-input" value={content.howItWorks.subtitle} onChange={(e) => updateHowItWorks('subtitle', e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <Label className="font-semibold text-white/80">Steps</Label>
                    <Button size="sm" variant="ghost" onClick={addStep} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-white/10">
                      <PlusCircle className="h-4 w-4 mr-1" />Add Step
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {content.howItWorks.steps.map((step, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">{i + 1}</div>
                            <span className="text-sm font-medium text-white/80">Step {i + 1}</span>
                          </div>
                          <button onClick={() => removeStep(i)} className="p-1 rounded text-red-400/60 hover:text-red-400"><Trash className="h-4 w-4" /></button>
                        </div>
                        <Input className="dash-input" value={step.title} onChange={(e) => updateStep(i, 'title', e.target.value)} placeholder="Step title" />
                        <Textarea className="dash-input" value={step.description} onChange={(e) => updateStep(i, 'description', e.target.value)} rows={2} placeholder="Step description" />
                        <div className="space-y-1">
                          <Label className="text-white/60 text-xs">Icon Name</Label>
                          <Select value={step.icon} onValueChange={(v) => updateStep(i, 'icon', v)}>
                            <SelectTrigger className="dash-input h-8"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#1a1430] border-white/10">
                              {['Search', 'Phone', 'MessageSquare', 'CheckCircle2', 'Shield', 'Zap', 'Globe', 'Star', 'ArrowRight', 'Code', 'Headphones', 'Users', 'CreditCard', 'Clock', 'TrendingUp'].map(icon => (
                                <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FEATURES */}
              {activeSection === 'features' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-lg font-semibold text-white/90">
                    <Star className="h-5 w-5 text-amber-400" />Features
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Section Title</Label>
                    <Input className="dash-input" value={content.features.title} onChange={(e) => updateFeatures('title', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Section Subtitle</Label>
                    <Input className="dash-input" value={content.features.subtitle} onChange={(e) => updateFeatures('subtitle', e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <Label className="font-semibold text-white/80">Feature Items</Label>
                    <Button size="sm" variant="ghost" onClick={addFeature} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-white/10">
                      <PlusCircle className="h-4 w-4 mr-1" />Add Feature
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {content.features.items.map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white/80">Feature {i + 1}</span>
                          <button onClick={() => removeFeature(i)} className="p-1 rounded text-red-400/60 hover:text-red-400"><Trash className="h-4 w-4" /></button>
                        </div>
                        <Input className="dash-input" value={item.title} onChange={(e) => updateFeatureItem(i, 'title', e.target.value)} placeholder="Feature title" />
                        <Textarea className="dash-input" value={item.description} onChange={(e) => updateFeatureItem(i, 'description', e.target.value)} rows={2} placeholder="Feature description" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-white/60 text-xs">Icon</Label>
                            <Select value={item.icon} onValueChange={(v) => updateFeatureItem(i, 'icon', v)}>
                              <SelectTrigger className="dash-input h-8"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-[#1a1430] border-white/10">
                                {['Zap', 'Globe', 'Shield', 'Headphones', 'BadgeDollarSign', 'Code', 'Star', 'Phone', 'Search', 'Users', 'TrendingUp', 'CheckCircle2', 'CreditCard', 'Clock', 'ArrowRight', 'MessageSquare'].map(icon => (
                                  <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/60 text-xs">Color</Label>
                            <Select value={item.color} onValueChange={(v) => updateFeatureItem(i, 'color', v)}>
                              <SelectTrigger className="dash-input h-8"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-[#1a1430] border-white/10">
                                <SelectItem value="violet">Violet</SelectItem>
                                <SelectItem value="cyan">Cyan</SelectItem>
                                <SelectItem value="pink">Pink</SelectItem>
                                <SelectItem value="orange">Orange</SelectItem>
                                <SelectItem value="emerald">Emerald</SelectItem>
                                <SelectItem value="blue">Blue</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TESTIMONIALS */}
              {activeSection === 'testimonials' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-lg font-semibold text-white/90">
                    <MessageSquareText className="h-5 w-5 text-pink-400" />Testimonials
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Section Title</Label>
                    <Input className="dash-input" value={content.testimonials.title} onChange={(e) => updateTestimonials('title', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Section Subtitle</Label>
                    <Input className="dash-input" value={content.testimonials.subtitle} onChange={(e) => updateTestimonials('subtitle', e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <Label className="font-semibold text-white/80">Testimonial Cards</Label>
                    <Button size="sm" variant="ghost" onClick={addTestimonial} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-white/10">
                      <PlusCircle className="h-4 w-4 mr-1" />Add Testimonial
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {content.testimonials.items.map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">{item.initials}</div>
                            <div>
                              <div className="font-medium text-sm text-white/80">{item.name}</div>
                              <div className="text-xs text-white/40">{item.role}</div>
                            </div>
                          </div>
                          <button onClick={() => removeTestimonial(i)} className="p-1 rounded text-red-400/60 hover:text-red-400"><Trash className="h-4 w-4" /></button>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div className="space-y-1"><Label className="text-white/60 text-xs">Name</Label><Input className="dash-input h-8 text-sm" value={item.name} onChange={(e) => updateTestimonialItem(i, 'name', e.target.value)} /></div>
                          <div className="space-y-1"><Label className="text-white/60 text-xs">Role</Label><Input className="dash-input h-8 text-sm" value={item.role} onChange={(e) => updateTestimonialItem(i, 'role', e.target.value)} /></div>
                          <div className="space-y-1"><Label className="text-white/60 text-xs">Initials</Label><Input className="dash-input h-8 text-sm" value={item.initials} onChange={(e) => updateTestimonialItem(i, 'initials', e.target.value)} maxLength={2} /></div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/60 text-xs">Testimonial Text</Label>
                          <Textarea className="dash-input" value={item.text} onChange={(e) => updateTestimonialItem(i, 'text', e.target.value)} rows={2} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/60 text-xs">Rating (1-5)</Label>
                          <Select value={String(item.rating)} onValueChange={(v) => updateTestimonialItem(i, 'rating', Number(v))}>
                            <SelectTrigger className="dash-input h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#1a1430] border-white/10">
                              {[1, 2, 3, 4, 5].map(r => (
                                <SelectItem key={r} value={String(r)}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              {activeSection === 'cta' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-lg font-semibold text-white/90">
                    <FileText className="h-5 w-5 text-orange-400" />CTA Section
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Title</Label>
                    <Input className="dash-input" value={content.cta.title} onChange={(e) => updateCTA('title', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Subtitle / Description</Label>
                    <Textarea className="dash-input" value={content.cta.subtitle} onChange={(e) => updateCTA('subtitle', e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Button Text</Label>
                    <Input className="dash-input" value={content.cta.buttonText} onChange={(e) => updateCTA('buttonText', e.target.value)} />
                  </div>
                  <div className="p-6 rounded-xl bg-gradient-to-br from-violet-950/50 to-cyan-950/50 border border-violet-500/20 text-center">
                    <div className="text-xs text-violet-400 mb-3 font-medium">PREVIEW</div>
                    <div className="text-xl font-bold text-white mb-2">{content.cta.title || 'Title'}</div>
                    <div className="text-gray-400 text-sm mb-4">{content.cta.subtitle || 'Subtitle...'}</div>
                    <div className="inline-flex px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-2xl font-medium">{content.cta.buttonText || 'Button'}</div>
                  </div>
                </div>
              )}

              {/* FOOTER */}
              {activeSection === 'footer' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-lg font-semibold text-white/90">
                    <Globe className="h-5 w-5 text-blue-400" />Footer
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Description</Label>
                    <Textarea className="dash-input" value={content.footer.description} onChange={(e) => updateFooter('description', e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Copyright Text</Label>
                    <Input className="dash-input" value={content.footer.copyright} onChange={(e) => updateFooter('copyright', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-white/80">Footer Links</Label>
                      <Button size="sm" variant="ghost" onClick={addFooterLink} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-white/10">
                        <PlusCircle className="h-4 w-4 mr-1" />Add Link
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {content.footer.links.map((link, i) => (
                        <div key={i} className="flex gap-2 items-end p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex-1 space-y-1">
                            <Label className="text-white/60 text-xs">Label</Label>
                            <Input className="dash-input h-8 text-sm" value={link.label} onChange={(e) => updateFooterLink(i, 'label', e.target.value)} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-white/60 text-xs">URL</Label>
                            <Input className="dash-input h-8 text-sm" value={link.url} onChange={(e) => updateFooterLink(i, 'url', e.target.value)} />
                          </div>
                          <button onClick={() => removeFooterLink(i)} className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 shrink-0"><Trash className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </motion.div>
  )
}
