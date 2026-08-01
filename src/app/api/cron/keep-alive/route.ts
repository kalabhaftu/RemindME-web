import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { error } = await supabase
    .from('reminder_items')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Supabase keep-alive query failed:', error)
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() })
}
