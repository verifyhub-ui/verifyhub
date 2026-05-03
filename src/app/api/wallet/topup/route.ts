import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

const DEFAULT_SETTINGS: Record<string, string> = {
  min_topup_amount: '1',
  max_topup_amount: '10000',
  topup_requires_approval: 'true',
  auto_approve_below: '50',
}

async function getSetting(key: string): Promise<string> {
  const setting = await db.settings.findUnique({
    where: { key },
  })
  return setting?.value ?? DEFAULT_SETTINGS[key] ?? ''
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { amount, method, txRef, proof } = body as {
      amount: number
      method?: string
      txRef?: string
      proof?: string
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    // Read settings from DB
    const [minTopupStr, maxTopupStr, requiresApprovalStr, autoApproveBelowStr] = await Promise.all([
      getSetting('min_topup_amount'),
      getSetting('max_topup_amount'),
      getSetting('topup_requires_approval'),
      getSetting('auto_approve_below'),
    ])

    const minTopup = parseFloat(minTopupStr) || 1
    const maxTopup = parseFloat(maxTopupStr) || 10000
    const requiresApproval = requiresApprovalStr === 'true'
    const autoApproveBelow = parseFloat(autoApproveBelowStr) || 50

    if (amount < minTopup) {
      return NextResponse.json(
        { error: `Minimum topup amount is $${minTopup}` },
        { status: 400 }
      )
    }

    if (amount > maxTopup) {
      return NextResponse.json(
        { error: `Maximum topup amount is $${maxTopup}` },
        { status: 400 }
      )
    }

    // Determine if auto-approve or needs manual review
    const shouldAutoApprove = !requiresApproval || amount < autoApproveBelow
    const finalStatus = shouldAutoApprove ? 'APPROVED' : 'PENDING'

    if (shouldAutoApprove) {
      // Auto-approve: add funds instantly, create APPROVED topup request
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      })

      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const balanceBefore = dbUser.balance
      const balanceAfter = balanceBefore + amount

      const result = await db.$transaction(async (tx) => {
        // Update user balance
        await tx.user.update({
          where: { id: user.id },
          data: { balance: balanceAfter },
        })

        // Create topup request as APPROVED
        const topupRequest = await tx.topupRequest.create({
          data: {
            userId: user.id,
            amount,
            method: method || 'manual',
            txRef: txRef || null,
            proof: proof || null,
            status: 'APPROVED',
            reviewedBy: user.id,
            reviewedAt: new Date(),
          },
        })

        // Create TOPUP transaction linked to the request
        const transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            topupRequestId: topupRequest.id,
            type: 'TOPUP',
            amount,
            balanceBefore,
            balanceAfter,
            description: `Wallet topup (auto-approved) via ${method || 'manual'} - $${amount.toFixed(2)}`,
          },
        })

        return { topupRequest, transaction }
      })

      return NextResponse.json({
        topupRequest: result.topupRequest,
        transaction: result.transaction,
        balance: balanceAfter,
        message: `$${amount.toFixed(2)} added to your wallet (auto-approved)`,
      })
    }

    // Create PENDING topup request for manual review
    const topupRequest = await db.topupRequest.create({
      data: {
        userId: user.id,
        amount,
        method: method || 'manual',
        txRef: txRef || null,
        proof: proof || null,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      topupRequest,
      message: `Topup request for $${amount.toFixed(2)} submitted and pending approval`,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/wallet/topup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
