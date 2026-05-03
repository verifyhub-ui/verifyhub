import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'verifyhub-jwt-secret-change-in-production'
const secretKey = new TextEncoder().encode(JWT_SECRET)
const COOKIE_NAME = 'verifyhub-token'

export interface AuthUser {
  id: string
  email: string
  role: string
}

// ==================== Password Hashing ====================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ==================== JWT Token ====================

export async function generateToken(payload: { userId: string; email: string; role: string }): Promise<string> {
  return new SignJWT({ sub: payload.userId, email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secretKey)
}

async function verifyJWT(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return {
      id: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

// ==================== Cookie Helpers ====================

export function createAuthCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production'
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}; Max-Age=${7 * 24 * 60 * 60}`
}

export function createLogoutCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

function getTokenFromRequest(request: NextRequest): string | null {
  // 1. Check Authorization: Bearer header
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    if (token) return token
  }

  // 2. Check cookie
  const cookies = request.headers.get('cookie')
  if (cookies) {
    const match = cookies.split(';').find(c => c.trim().startsWith(`${COOKIE_NAME}=`))
    if (match) {
      const token = match.split('=').slice(1).join('=').trim()
      if (token) return token
    }
  }

  return null
}

// ==================== Auth Middleware ====================

export class AuthError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number = 401) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AuthError'
  }
}

export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }
  console.error('Auth error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const token = getTokenFromRequest(request)
  if (!token) {
    throw new AuthError('Missing or invalid authorization', 401)
  }

  const user = await verifyJWT(token)
  if (!user) {
    throw new AuthError('Invalid or expired token', 401)
  }

  // Verify user still exists and is active
  const { db } = await import('./db')
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true, isActive: true },
  })

  if (!dbUser || !dbUser.isActive) {
    throw new AuthError('User not found or inactive', 401)
  }

  return user
}

export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request)
  if (user.role !== 'ADMIN') {
    throw new AuthError('Admin access required', 403)
  }
  return user
}
