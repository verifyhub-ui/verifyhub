import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    // Total counts
    const [totalUsers, totalOrders, activeOrdersResult] = await Promise.all([
      db.user.count(),
      db.order.count(),
      db.order.count({ where: { status: { in: ['PENDING', 'ACTIVE'] } } }),
    ])

    // Revenue from completed transactions — PURCHASE stores negative amounts, use Math.abs
    const revenueData = await db.transaction.aggregate({
      where: { type: 'PURCHASE' },
      _sum: { amount: true },
    })
    const totalRevenue = Math.abs(revenueData._sum.amount ?? 0)

    // Recent orders (last 20)
    const recentOrders = await db.order.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        providerService: {
          include: {
            service: { select: { id: true, name: true, category: true } },
            country: { select: { id: true, name: true, code: true, phoneCode: true } },
          },
        },
        transaction: { select: { id: true, amount: true } },
      },
    })

    // Orders by status
    const ordersByStatus = await db.order.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const statusCounts = ordersByStatus.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count.id
      return acc
    }, {})

    // Revenue by day (last 30 days) — fetch all PURCHASE transactions and aggregate in JS
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const recentTransactions = await db.transaction.findMany({
      where: {
        type: 'PURCHASE',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, amount: true },
    })

    // Group by date string in application code (SQLite doesn't support date truncation in groupBy)
    const revenueByDay: Record<string, number> = {}
    for (const tx of recentTransactions) {
      const dateKey = tx.createdAt.toISOString().split('T')[0]
      revenueByDay[dateKey] = (revenueByDay[dateKey] ?? 0) + Math.abs(tx.amount ?? 0)
    }

    // Top services by orders
    const topServices = await db.providerService.groupBy({
      by: ['serviceId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const topServiceDetails = await Promise.all(
      topServices.map(async (item) => {
        const service = await db.service.findUnique({
          where: { id: item.serviceId },
          select: { id: true, name: true, category: true },
        })
        return {
          serviceId: item.serviceId,
          name: service?.name ?? 'Unknown',
          category: service?.category ?? 'Unknown',
          orderCount: item._count.id,
        }
      })
    )

    // Topup stats
    const [pendingTopupCount, pendingTopupAmountResult, approvedTopupAmountResult] = await Promise.all([
      db.topupRequest.count({ where: { status: 'PENDING' } }),
      db.topupRequest.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      db.topupRequest.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ])

    const pendingTopupAmount = pendingTopupAmountResult._sum.amount ?? 0
    const totalTopupVolume = approvedTopupAmountResult._sum.amount ?? 0

    return NextResponse.json({
      stats: {
        totalUsers,
        totalOrders,
        totalRevenue,
        activeOrders: activeOrdersResult,
        pendingTopups: pendingTopupCount,
        pendingTopupAmount,
        totalTopupVolume,
      },
      recentOrders,
      ordersByStatus: statusCounts,
      revenueByDay,
      topServices: topServiceDetails,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN DASHBOARD] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
