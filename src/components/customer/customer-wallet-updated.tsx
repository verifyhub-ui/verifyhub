'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { api, type PaginatedResponse } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Wallet, Clock, CheckCircle2, XCircle, Loader2, DollarSign, AlertCircle, Send, CreditCard, Building2, Bitcoin, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'

// ==================== Types ====================

interface TopupRequest {
  id: string
  userId: string
  amount: number
  method: string
  txRef: string | null
  proof: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

interface TopupResponse {
  message: string
  topupRequest: {
    id: string
    amount: number
    method: string
    status: 'PENDING' | 'APPROVED'
  }
  newBalance?: number
}

interface TransactionRow {
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  createdAt: string
}

type PaymentMethod = 'manual' | 'crypto' | 'bank' | 'other'

const PRESET_AMOUNTS = [10, 25, 50, 100]

const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: React.ReactNode }> = {
  manual: { label: 'Manual Transfer', icon: <Send className="h-4 w-4" /> },
  crypto: { label: 'Cryptocurrency', icon: <Bitcoin className="h-4 w-4" /> },
  bank: { label: 'Bank Transfer', icon: <Building2 className="h-4 w-4" /> },
  other: { label: 'Other', icon: <HelpCircle className="h-4 w-4" /> },
}

// ==================== Status Badge ====================

function TopupStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600 dark:text-amber-400">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    case 'APPROVED':
      return (
        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 dark:bg-green-950/30 dark:border-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      )
    case 'REJECTED':
      return (
        <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30 dark:border-red-600 dark:text-red-400">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// ==================== Main Component ====================

export function WalletTab() {
  const { user, fetchUser } = useAuthStore()

  // Topup form state
  const [topupAmount, setTopupAmount] = useState('')
  const [topupMethod, setTopupMethod] = useState<PaymentMethod | ''>('')
  const [topupTxRef, setTopupTxRef] = useState('')
  const [topupProof, setTopupProof] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Submit result state
  const [submitResult, setSubmitResult] = useState<TopupResponse | null>(null)

  // Data state
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  // Computed pending amount from topup requests
  const pendingTopupAmount = topupRequests
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amount, 0)

  // ==================== Fetchers ====================

  const fetchTopupRequests = useCallback(async () => {
    setLoadingRequests(true)
    try {
      const data = await api.get<PaginatedResponse<TopupRequest>>('/api/wallet/topup-requests')
      setTopupRequests(data.data)
    } catch {
      toast.error('Failed to load topup requests')
    } finally {
      setLoadingRequests(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    setLoadingTransactions(true)
    try {
      const data = await api.get<PaginatedResponse<TransactionRow>>('/api/wallet/history')
      setTransactions(data.data)
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoadingTransactions(false)
    }
  }, [])

  useEffect(() => {
    fetchTopupRequests()
    fetchTransactions()
  }, [fetchTopupRequests, fetchTransactions])

  // ==================== Handlers ====================

  const handleSubmitTopup = async () => {
    const amount = parseFloat(topupAmount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!topupMethod) {
      toast.error('Please select a payment method')
      return
    }

    setSubmitting(true)
    setSubmitResult(null)

    try {
      const body: { amount: number; method: PaymentMethod; txRef?: string; proof?: string } = {
        amount,
        method: topupMethod,
      }
      if (topupTxRef.trim()) body.txRef = topupTxRef.trim()
      if (topupProof.trim()) body.proof = topupProof.trim()

      const data = await api.post<TopupResponse>('/api/wallet/topup', body)
      setSubmitResult(data)

      if (data.topupRequest.status === 'APPROVED') {
        toast.success(`$${amount.toFixed(2)} added to your balance!`)
        await fetchUser()
      } else {
        toast.success('Topup request submitted successfully')
      }

      // Reset form
      setTopupAmount('')
      setTopupMethod('')
      setTopupTxRef('')
      setTopupProof('')

      // Refresh data
      fetchTopupRequests()
      fetchTransactions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Topup request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePresetAmount = (amount: number) => {
    setTopupAmount(String(amount))
  }

  // ==================== Render ====================

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Wallet</h2>
        <p className="text-muted-foreground">Manage your balance and transactions</p>
      </div>

      {/* ========== Balance Card ========== */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Current Balance</CardTitle>
                <CardDescription>Your available funds</CardDescription>
              </div>
            </div>
            {pendingTopupAmount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                <span>${pendingTopupAmount.toFixed(2)} pending</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">
            <DollarSign className="h-6 w-6 inline-block mr-1 text-muted-foreground" />
            {user?.balance.toFixed(2) ?? '0.00'}
          </div>
          {pendingTopupAmount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Including ${pendingTopupAmount.toFixed(2)} pending approval
            </p>
          )}

          {/* Quick preset buttons */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Quick amount</p>
            <div className="flex gap-2 flex-wrap">
              {PRESET_AMOUNTS.map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handlePresetAmount(amt)}
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== Topup Request Form ========== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Request Topup</CardTitle>
              <CardDescription>Submit a topup request for admin approval</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmitTopup()
            }}
            className="space-y-4"
          >
            {/* Amount + Method on same row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="topup-amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="topup-amount"
                    type="number"
                    placeholder="0.00"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topup-method">
                  Payment Method <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={topupMethod}
                  onValueChange={(v) => setTopupMethod(v as PaymentMethod)}
                >
                  <SelectTrigger id="topup-method">
                    <SelectValue placeholder="Select a method" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PAYMENT_METHOD_CONFIG) as [PaymentMethod, { label: string; icon: React.ReactNode }][]).map(
                      ([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            {config.icon}
                            {config.label}
                          </span>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Transaction Reference */}
            <div className="space-y-2">
              <Label htmlFor="topup-txref">
                Transaction Reference
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Input
                id="topup-txref"
                placeholder="Crypto TX hash, bank reference number, etc."
                value={topupTxRef}
                onChange={(e) => setTopupTxRef(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Provide a reference so the admin can verify your payment
              </p>
            </div>

            {/* Proof of Payment */}
            <div className="space-y-2">
              <Label htmlFor="topup-proof">
                Proof of Payment / Notes
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Textarea
                id="topup-proof"
                placeholder="Paste receipt URL, additional notes, or payment details..."
                value={topupProof}
                onChange={(e) => setTopupProof(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Submit Result */}
            {submitResult && (
              <div
                className={`rounded-lg border p-4 ${
                  submitResult.topupRequest.status === 'APPROVED'
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                    : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {submitResult.topupRequest.status === 'APPROVED' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {submitResult.topupRequest.status === 'APPROVED' ? (
                      <>
                        <p className="font-medium text-green-800 dark:text-green-300">
                          Topup Approved!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                          ${submitResult.topupRequest.amount.toFixed(2)} has been added to your wallet.
                          {submitResult.newBalance !== undefined && (
                            <span className="ml-1 font-semibold">
                              New balance: ${submitResult.newBalance.toFixed(2)}
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-amber-800 dark:text-amber-300">
                          Request Pending Approval
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          Your topup request of ${submitResult.topupRequest.amount.toFixed(2)} via{' '}
                          {submitResult.topupRequest.method} is pending admin review. You will be notified once approved.
                        </p>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setSubmitResult(null)}
                  >
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={submitting || !topupAmount || !topupMethod}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Topup Request
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ========== Topup Requests History ========== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <AlertCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Topup Requests</CardTitle>
                <CardDescription>Your recent topup request history</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTopupRequests} disabled={loadingRequests}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRequests ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : topupRequests.length > 0 ? (
            <div className="divide-y">
              {topupRequests.map((req) => (
                <div key={req.id} className="px-4 py-3 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                        {req.status === 'PENDING' && <Clock className="h-4 w-4 text-amber-500" />}
                        {req.status === 'APPROVED' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {req.status === 'REJECTED' && <XCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            ${req.amount.toFixed(2)}
                          </span>
                          <TopupStatusBadge status={req.status} />
                          <Badge variant="secondary" className="text-xs capitalize">
                            {PAYMENT_METHOD_CONFIG[req.method as PaymentMethod]?.label ?? req.method}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(req.createdAt).toLocaleString()}
                          {req.txRef && (
                            <span className="ml-2 font-mono">
                              Ref: {req.txRef.length > 16 ? `${req.txRef.slice(0, 16)}...` : req.txRef}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <div className="hidden sm:block text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded max-w-48 truncate">
                        {req.rejectionReason}
                      </div>
                    )}
                  </div>
                  {/* Show rejection reason on mobile */}
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <div className="sm:hidden mt-2 ml-12 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
                      Reason: {req.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Send className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No topup requests yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Submit your first topup request using the form above
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ========== Transaction History ========== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Transaction History</CardTitle>
                <CardDescription>All balance changes</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransactions}
              disabled={loadingTransactions}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingTransactions ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Balance After</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge variant="outline">{t.type}</Badge>
                      </TableCell>
                      <TableCell
                        className={
                          t.amount >= 0
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : 'text-red-600 dark:text-red-400 font-medium'
                        }
                      >
                        {t.amount >= 0 ? '+' : ''}
                        {t.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        ${t.balanceAfter.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-48 truncate">
                        {t.description ?? '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                        {new Date(t.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="text-xs mt-1">
                Transactions will appear here as you use the service
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
