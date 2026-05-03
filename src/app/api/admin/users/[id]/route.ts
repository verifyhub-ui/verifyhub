import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request)

    const { id } = await context.params

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            transactions: true,
            notifications: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ data: user })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN USERS/:ID] GET Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request)

    const { id } = await context.params
    const body = await request.json()
    const { name, role, balance, isActive } = body

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      updateData.name = typeof name === 'string' ? name : null
    }

    if (role !== undefined) {
      if (!['USER', 'ADMIN'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be USER or ADMIN' },
          { status: 400 }
        )
      }
      updateData.role = role
    }

    if (balance !== undefined) {
      if (typeof balance !== 'number' || balance < 0) {
        return NextResponse.json(
          { error: 'Balance must be a non-negative number' },
          { status: 400 }
        )
      }
      updateData.balance = balance
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ data: updatedUser })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN USERS/:ID] PUT Error:', err)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request)

    const { id } = await context.params

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const deactivatedUser = await db.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    })

    return NextResponse.json({
      data: deactivatedUser,
      message: 'User deactivated successfully',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN USERS/:ID] DELETE Error:', err)
    return NextResponse.json(
      { error: 'Failed to deactivate user' },
      { status: 500 }
    )
  }
}
