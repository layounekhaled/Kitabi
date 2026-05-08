import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Simple base64 encoding for MVP token
function encodeToken(payload: Record<string, string>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

// POST /api/admin/login - Admin login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find admin by email
    const admin = await db.admin.findUnique({ where: { email } })

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Simple password comparison (MVP - in production, use bcrypt)
    if (admin.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate a simple token (MVP approach)
    const token = encodeToken({
      adminId: admin.id,
      email: admin.email,
      timestamp: Date.now().toString(),
    })

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    })
  } catch (error) {
    console.error('Error during admin login:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
