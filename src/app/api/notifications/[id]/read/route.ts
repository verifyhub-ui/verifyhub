import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request)
    const { id } = await context.params

    const notification = await db.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json({ message: 'Notification marked as read' })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/notifications/[id]/read error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
