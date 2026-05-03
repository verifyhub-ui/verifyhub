import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin(request)
    const { id } = await context.params
    const body = await request.json()
    const { amount, description } = body as { amount: number; description: string }

    if (typeof amount !== 'number') {
      return NextResponse.json({ error: 'Amount must be a number' }, { status: 400 })
    }

    if (amount === 0) {
      return NextResponse.json({ error: 'Amount cannot be zero' }, { status: 400 })
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const targetUser = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, balance: true, isActive: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!targetUser.isActive) {
      return NextResponse.json({ error: 'User is inactive' }, { status: 400 })
    }

    // Ensure balance won't go negative on deduction
    if (amount < 0 && targetUser.balance + amount < 0) {
      return NextResponse.json(
        { error: `Insufficient balance. Current balance: $${targetUser.balance.toFixed(2)}` },
        { status: 400 }
      )
    }

    const balanceBefore = targetUser.balance
    const balanceAfter = balanceBefore + amount

    const result = await db.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: { balance: balanceAfter },
        select: { id: true, email: true, name: true, balance: true },
      })

      const transaction = await tx.transaction.create({
        data: {
          userId: id,
          type: 'ADJUSTMENT',
          amount,
          balanceBefore,
          balanceAfter,
          description: `[Admin: ${admin.email}] ${description}`,
        },
      })

      return { user: updatedUser, transaction }
    })

    // Create notification for the user
    const action = amount > 0 ? 'added to' : 'deducted from'
    await db.notification.create({
      data: {
        userId: id,
        title: 'Balance Adjusted',
        message: `$${Math.abs(amount).toFixed(2)} has been ${action} your wallet by an administrator. ${description}`,
        type: amount > 0 ? 'SUCCESS' : 'WARNING',
      },
    })

    return NextResponse.json({
      data: result.user,
      transaction: result.transaction,
      message: `Balance ${amount > 0 ? 'increased' : 'decreased'} by $${Math.abs(amount).toFixed(2)}`,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN USERS/:ID/ADJUST-BALANCE] POST Error:', err)
    return NextResponse.json(
      { error: 'Failed to adjust balance' },
      { status: 500 }
    )
  }
}
