import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { getAuthenticatedUser } from '@/lib/auth-helper'
import { decrypt, encrypt } from '@/lib/encryption'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

async function getOrCreateFeedUrl(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: current } = await supabase
    .from('calendar_feed_tokens')
    .select('token_encrypted')
    .eq('user_id', user.id)
    .maybeSingle()

  let token: string
  if (!current) {
    token = randomBytes(32).toString('base64url')
    const { error } = await supabase.from('calendar_feed_tokens').insert({ user_id: user.id, token_hash: hashToken(token), token_encrypted: encrypt(token) })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({
      webcalUrl: `webcal://${new URL(request.url).host}/api/calendar/feed/${decrypt(current.token_encrypted)}`,
      httpsUrl: `https://${new URL(request.url).host}/api/calendar/feed/${decrypt(current.token_encrypted)}`,
    })
  }

  return NextResponse.json({
    webcalUrl: `webcal://${new URL(request.url).host}/api/calendar/feed/${token}`,
    httpsUrl: `https://${new URL(request.url).host}/api/calendar/feed/${token}`,
  })
}

export async function GET(request: Request) {
  return getOrCreateFeedUrl(request)
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = randomBytes(32).toString('base64url')
  const { error } = await supabase.from('calendar_feed_tokens').upsert({
    user_id: user.id,
    token_hash: hashToken(token),
    token_encrypted: encrypt(token),
    rotated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const host = new URL(request.url).host
  return NextResponse.json({ webcalUrl: `webcal://${host}/api/calendar/feed/${token}`, httpsUrl: `https://${host}/api/calendar/feed/${token}` })
}
