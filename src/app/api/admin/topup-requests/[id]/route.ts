import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin(request)
    const { id } = await context.params
    const body = await request.json()
    const { action, reason } = body as { action: 'approve' | 'reject'; reason?: string }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 })
    }

    const topupRequest = await db.topupRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, balance: true } },
      },
    })

    if (!topupRequest) {
      return NextResponse.json({ error: 'Topup request not found' }, { status: 404 })
    }

    if (topupRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Topup request already ${topupRequest.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      const balanceBefore = topupRequest.user.balance
      const balanceAfter = balanceBefore + topupRequest.amount

      const updated = await db.$transaction(async (tx) => {
        // Update user balance
        await tx.user.update({
          where: { id: topupRequest.userId },
          data: { balance: balanceAfter },
        })

        // Create TOPUP transaction linked to this request
        const transaction = await tx.transaction.create({
          data: {
            userId: topupRequest.userId,
            topupRequestId: id,
            type: 'TOPUP',
            amount: topupRequest.amount,
            balanceBefore,
            balanceAfter,
            description: `Wallet topup approved - $${topupRequest.amount.toFixed(2)} via ${topupRequest.method}`,
          },
        })

        // Update topup request status
        const updatedRequest = await tx.topupRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            reviewedBy: admin.id,
            reviewedAt: new Date(),
          },
          include: {
            user: { select: { id: true, email: true, name: true } },
            transaction: { select: { id: true, amount: true, type: true } },
          },
        })

        return { updatedRequest, transaction }
      })

      // Create notification for user
      await db.notification.create({
        data: {
          userId: topupRequest.userId,
          title: 'Topup Approved',
          message: `Your topup request for $${topupRequest.amount.toFixed(2)} has been approved and added to your wallet.`,
          type: 'SUCCESS',
        },
      })

      return NextResponse.json({
        data: updated.updatedRequest,
        transaction: updated.transaction,
        message: 'Topup request approved',
      })
    }

    // Reject
    const updatedRequest = await db.topupRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || null,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        transaction: { select: { id: true, amount: true, type: true } },
      },
    })

    // Create notification for user
    await db.notification.create({
      data: {
        userId: topupRequest.userId,
        title: 'Topup Rejected',
        message: `Your topup request for $${topupRequest.amount.toFixed(2)} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
        type: 'WARNING',
      },
    })

    return NextResponse.json({
      data: updatedRequest,
      message: 'Topup request rejected',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN TOPUP REQUESTS/:ID] PUT Error:', err)
    return NextResponse.json(
      { error: 'Failed to process topup request' },
      { status: 500 }
    )
  }
}
