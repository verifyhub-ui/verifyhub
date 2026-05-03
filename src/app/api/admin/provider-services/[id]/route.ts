import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request)
    const { id } = await context.params
    const body = await request.json()
    const { markupPercent, externalPrice, isActive } = body as {
      markupPercent?: number
      externalPrice?: number
      isActive?: boolean
    }

    const providerService = await db.providerService.findUnique({
      where: { id },
      include: {
        provider: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
        country: { select: { id: true, name: true, code: true } },
      },
    })

    if (!providerService) {
      return NextResponse.json({ error: 'Provider service not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (markupPercent !== undefined) {
      if (typeof markupPercent !== 'number' || markupPercent < 0) {
        return NextResponse.json({ error: 'Markup percent must be a non-negative number' }, { status: 400 })
      }
      updateData.markupPercent = markupPercent
    }

    if (externalPrice !== undefined) {
      if (typeof externalPrice !== 'number' || externalPrice < 0) {
        return NextResponse.json({ error: 'External price must be a non-negative number' }, { status: 400 })
      }
      updateData.externalPrice = externalPrice
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await db.providerService.update({
      where: { id },
      data: updateData,
      include: {
        provider: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, category: true } },
        country: { select: { id: true, name: true, code: true, phoneCode: true } },
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ADMIN PROVIDER-SERVICES/:ID] PUT Error:', err)
    return NextResponse.json(
      { error: 'Failed to update provider service' },
      { status: 500 }
    )
  }
}
