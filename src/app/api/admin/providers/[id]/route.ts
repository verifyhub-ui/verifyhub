import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request)
    const { id } = await context.params

    const provider = await db.provider.findUnique({
      where: { id },
      include: {
        providerServices: {
          include: {
            service: { select: { id: true, name: true, category: true } },
            country: { select: { id: true, name: true, code: true } },
          },
        },
      },
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    return NextResponse.json({ data: provider })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN PROVIDERS/:ID] GET Error:', err)
    return NextResponse.json({ error: 'Failed to fetch provider' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request)
    const { id } = await context.params
    const body = await request.json()

    const provider = await db.provider.findUnique({ where: { id } })
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = String(body.name)
    if (body.apiKey !== undefined) updateData.apiKey = body.apiKey ? String(body.apiKey) : null
    if (body.apiUrl !== undefined) updateData.apiUrl = String(body.apiUrl)
    if (body.priority !== undefined) updateData.priority = Number(body.priority)
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

    const updated = await db.provider.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN PROVIDERS/:ID] PUT Error:', err)
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request)
    const { id } = await context.params

    // Check if provider has orders referencing its services
    const providerWithOrders = await db.provider.findUnique({
      where: { id },
      include: {
        providerServices: {
          include: {
            _count: { select: { orders: true } },
          },
        },
      },
    })

    if (!providerWithOrders) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    const totalOrders = providerWithOrders.providerServices.reduce(
      (sum, ps) => sum + ps._count.orders,
      0
    )

    if (totalOrders > 0) {
      // Soft-delete: deactivate instead of removing
      await db.provider.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        message: `Provider deactivated (has ${totalOrders} existing orders). Set to inactive.`,
        deactivated: true,
      })
    }

    await db.provider.delete({ where: { id } })
    return NextResponse.json({ message: 'Provider deleted' })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    // Handle foreign key constraint error gracefully
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('Foreign key constraint')) {
      // Fallback: soft-delete
      try {
        await db.provider.update({
          where: { id: (await context.params).id },
          data: { isActive: false },
        })
        return NextResponse.json({
          message: 'Provider deactivated due to existing references',
          deactivated: true,
        })
      } catch {
        return NextResponse.json({ error: 'Failed to delete or deactivate provider' }, { status: 500 })
      }
    }
    console.error('[ADMIN PROVIDERS/:ID] DELETE Error:', err)
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 })
  }
}
