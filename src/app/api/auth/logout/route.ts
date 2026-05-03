import { NextResponse } from 'next/server'
import { createLogoutCookie } from '@/lib/auth'

export async function POST() {
  return NextResponse.json(
    { message: 'Logged out successfully' },
    {
      headers: {
        'Set-Cookie': createLogoutCookie(),
      },
    }
  )
}
