import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limiter'

const checkEmailLimiter = rateLimit({ interval: 60_000, max: 10 })

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkEmailLimiter(ip)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  let email: string
  try {
    const body = await request.json()
    email = body?.email?.trim()?.toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email)

  if (error) {
    if (error.status === 404) {
      return NextResponse.json({ exists: false, email })
    }
    return NextResponse.json({ error: 'Failed to check email' }, { status: 500 })
  }

  if (!data?.user) {
    return NextResponse.json({ exists: false, email })
  }

  const identities = data.user.identities ?? []
  const providers = identities.map(i => i.provider).filter(Boolean) as string[]

  return NextResponse.json({
    exists: true,
    email,
    providers,
    created_at: data.user.created_at,
  })
}
