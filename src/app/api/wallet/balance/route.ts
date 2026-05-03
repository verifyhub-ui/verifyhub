import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { balance: true },
    })

    return NextResponse.json({ balance: dbUser?.balance ?? 0 })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('GET /api/wallet/balance error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
