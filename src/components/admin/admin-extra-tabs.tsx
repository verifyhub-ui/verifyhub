'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Settings, Save, Info,
  DollarSign, CheckCircle2, XCircle, Clock, RefreshCw, Wallet, AlertCircle,
} from 'lucide-react'

// ==================== TYPES ====================

interface PlatformSettings {
  default_markup_percent: number
  min_topup_amount: number
  max_topup_amount: number
  topup_requires_approval: boolean
  auto_approve_below: number
  platform_name: string
  support_email: string
  order_expiry_minutes: number
}

type TopupRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type FilterStatus = 'ALL' | TopupRequestStatus

interface TopupRequest {
  id: string
  userId: string
  amount: number
  method: string
  txRef: string | null
  proof: string | null
  rejectionReason: string | null
  status: TopupRequestStatus
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    email: string
    name: string | null
  }
  transaction?: {
    id: string
    amount: number
    type: string
    balanceBefore: number
    balanceAfter: number
  }
}

interface TopupRequestsResponse {
  data: TopupRequest[]
  summary: {
    pendingCount: number
    pendingTotal: number
    approvedCount: number
    rejectedCount: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ==================== SETTINGS TAB ====================

export function SettingsTab() {
  const [settings, setSettings] = useState<PlatformSettings>({
    default_markup_percent: 15,
    min_topup_amount: 10,
    max_topup_amount: 10000,
    topup_requires_approval: true,
    auto_approve_below: 50,
    platform_name: 'VerifyHub',
    support_email: 'support@verifyhub.com',
    order_expiry_minutes: 20,
  })
  const [originalSettings, setOriginalSettings] = useState<PlatformSettings>(settings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get<{ data: PlatformSettings }>('/api/admin/settings')
      setSettings(response.data)
      setOriginalSettings(response.data)
    } catch {
      toast.error('Failed to load platform settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/api/admin/settings', { settings })
      setOriginalSettings(settings)
      toast.success('Platform settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(originalSettings)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-violet-500" />
            Platform Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure platform-wide defaults and policies
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Discard
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          You have unsaved changes. Don&apos;t forget to save!
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pricing Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <span className="text-violet-600 text-sm font-bold">$</span>
              </div>
              <div>
                <CardTitle className="text-base">Pricing</CardTitle>
                <CardDescription className="text-xs">Revenue &amp; payment limits</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="default_markup_percent" className="text-sm font-medium">
                Default Markup (%)
              </Label>
              <Input
                id="default_markup_percent"
                type="number"
                min={0}
                max={200}
                value={settings.default_markup_percent}
                onChange={e => updateSetting('default_markup_percent', Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Applied to new provider services (0–200%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_topup_amount" className="text-sm font-medium">
                Min Topup Amount ($)
              </Label>
              <Input
                id="min_topup_amount"
                type="number"
                min={0}
                step={0.01}
                value={settings.min_topup_amount}
                onChange={e => updateSetting('min_topup_amount', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_topup_amount" className="text-sm font-medium">
                Max Topup Amount ($)
              </Label>
              <Input
                id="max_topup_amount"
                type="number"
                min={0}
                step={0.01}
                value={settings.max_topup_amount}
                onChange={e => updateSetting('max_topup_amount', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto_approve_below" className="text-sm font-medium">
                Auto-Approve Below ($)
              </Label>
              <Input
                id="auto_approve_below"
                type="number"
                min={0}
                step={0.01}
                value={settings.auto_approve_below}
                onChange={e => updateSetting('auto_approve_below', Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Requests under this amount skip manual approval
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-600 text-sm font-bold">🔒</span>
              </div>
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription className="text-xs">Approval &amp; verification</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="space-y-1 pr-4">
                <Label htmlFor="topup_requires_approval" className="text-sm font-medium cursor-pointer">
                  Topup Approval Required
                </Label>
                <p className="text-xs text-muted-foreground">
                  Require admin review for all fund topup requests
                </p>
              </div>
              <Switch
                id="topup_requires_approval"
                checked={settings.topup_requires_approval}
                onCheckedChange={v => updateSetting('topup_requires_approval', v)}
              />
            </div>

            {settings.topup_requires_approval && (
              <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                <p className="text-xs text-violet-700 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Approval is enabled. Requests below <strong>${settings.auto_approve_below}</strong> will
                    be automatically approved.
                  </span>
                </p>
              </div>
            )}

            {!settings.topup_requires_approval && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Approval is disabled. All topup requests will be processed automatically.
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* General Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                <span className="text-cyan-600 text-sm font-bold">⚙</span>
              </div>
              <div>
                <CardTitle className="text-base">General</CardTitle>
                <CardDescription className="text-xs">Display &amp; behavior</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="platform_name" className="text-sm font-medium">
                Platform Name
              </Label>
              <Input
                id="platform_name"
                type="text"
                value={settings.platform_name}
                onChange={e => updateSetting('platform_name', e.target.value)}
                placeholder="VerifyHub"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_email" className="text-sm font-medium">
                Support Email
              </Label>
              <Input
                id="support_email"
                type="email"
                value={settings.support_email}
                onChange={e => updateSetting('support_email', e.target.value)}
                placeholder="support@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_expiry_minutes" className="text-sm font-medium">
                Order Expiry (minutes)
              </Label>
              <Input
                id="order_expiry_minutes"
                type="number"
                min={1}
                value={settings.order_expiry_minutes}
                onChange={e => updateSetting('order_expiry_minutes', Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Inactive orders auto-expire after this period
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== FUND REQUESTS TAB ====================

export function FundRequestsTab() {
  const [requests, setRequests] = useState<TopupRequest[]>([])
  const [summary, setSummary] = useState({
    pendingCount: 0,
    pendingTotal: 0,
    approvedCount: 0,
    rejectedCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('PENDING')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const PAGE_SIZE = 10

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      }
      if (filter !== 'ALL') {
        params.status = filter
      }
      const data = await api.get<TopupRequestsResponse>('/api/admin/topup-requests', params)
      setRequests(data.data)
      setSummary(data.summary)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    } catch {
      toast.error('Failed to load topup requests')
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleFilterChange = (status: FilterStatus) => {
    setFilter(status)
    setPage(1)
  }

  const handleApprove = async (id: string) => {
    setSubmitting(true)
    try {
      await api.put(`/api/admin/topup-requests/${id}`, { action: 'approve' })
      toast.success('Topup request approved')
      fetchRequests()
    } catch {
      toast.error('Failed to approve request')
    } finally {
      setSubmitting(false)
    }
  }

  const openRejectDialog = (id: string) => {
    setRejectingId(id)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return
    setSubmitting(true)
    try {
      await api.put(`/api/admin/topup-requests/${rejectingId}`, {
        action: 'reject',
        reason: rejectReason.trim(),
      })
      toast.success('Topup request rejected')
      setRejectDialogOpen(false)
      setRejectingId(null)
      setRejectReason('')
      fetchRequests()
    } catch {
      toast.error('Failed to reject request')
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (status: TopupRequestStatus) => {
    const styles: Record<TopupRequestStatus, string> = {
      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
      APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
    }
    const icons: Record<TopupRequestStatus, React.ReactNode> = {
      PENDING: <Clock className="h-3 w-3 mr-1" />,
      APPROVED: <CheckCircle2 className="h-3 w-3 mr-1" />,
      REJECTED: <XCircle className="h-3 w-3 mr-1" />,
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
      >
        {icons[status]}
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-violet-500" />
            Fund Requests
          </h2>
          <p className="text-muted-foreground mt-1">
            Review and manage user topup requests
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{summary.pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold">${summary.pendingTotal.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved (Total)</p>
                <p className="text-2xl font-bold">{summary.approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected (Total)</p>
                <p className="text-2xl font-bold">{summary.rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterStatus[]).map((status) => {
          const count =
            status === 'ALL'
              ? total
              : status === 'PENDING'
                ? summary.pendingCount
                : status === 'APPROVED'
                  ? summary.approvedCount
                  : summary.rejectedCount

          return (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(status)}
              className={filter === status ? 'bg-violet-600 hover:bg-violet-700 text-white' : ''}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
              <Badge
                variant="secondary"
                className={`ml-2 h-5 px-1.5 text-xs ${
                  filter === status
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {count}
              </Badge>
            </Button>
          )
        })}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <div className="flex-1" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No requests found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {filter === 'ALL'
                  ? 'There are no topup requests yet.'
                  : `No ${filter.toLowerCase()} topup requests to display.`}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Tx Reference</TableHead>
                      <TableHead>Proof</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {req.user?.email || req.userId}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-emerald-700">
                            ${req.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {req.method || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px]">
                          {req.txRef ? (
                            <span title={req.txRef}>
                              {req.txRef.length > 16
                                ? req.txRef.slice(0, 16) + '...'
                                : req.txRef}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {req.proof ? (
                            <a
                              href={req.proof}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-600 hover:text-violet-800 text-sm underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(req.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(req.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {req.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                                onClick={() => handleApprove(req.id)}
                                disabled={submitting}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
                                onClick={() => openRejectDialog(req.id)}
                                disabled={submitting}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {req.status !== 'PENDING' && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    {buildPagination(page, totalPages).map((p, idx, arr) => (
                      <span key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          className={p === page ? 'bg-violet-600 hover:bg-violet-700 text-white h-8 w-8 p-0' : 'h-8 w-8 p-0'}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      </span>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Reject Topup Request
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this topup request. The user will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g., Payment proof is unclear or invalid..."
                rows={3}
              />
            </div>
            {rejectReason.trim().length > 0 && rejectReason.trim().length < 5 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Please provide a more detailed reason (at least 5 characters)
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || rejectReason.trim().length < 5}
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Confirm Rejection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== HELPERS ====================

function buildPagination(currentPage: number, totalPages: number): number[] {
  const pages: number[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
      pages.push(p)
    }
  }
  return pages
}
